import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Any

from dodopayments import DodoPayments
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.client import Client
from app.models.enums import BillingInterval, ClientStatus, PaymentStatus, SubscriptionStatus
from app.repositories.factory import build_repositories
from app.services.email_sender import get_email_sender
from app.services.email_templates import build_subscription_welcome_email

logger = logging.getLogger(__name__)

# Label stored on the Subscription row — cosmetic only, the actual price
# charged always comes from the webhook payload (recurring_pre_tax_amount),
# not from a constant here, so it can never drift from what Dodo billed.
PLAN_NAME = "Leadwire Pro (Monthly, $199)"

# Our own Subscription.status (see app/models/enums.py) for each Dodo
# subscription status (app/models/billing.py Subscription docstring).
_SUBSCRIPTION_STATUS_MAP: dict[str, SubscriptionStatus] = {
    "pending": SubscriptionStatus.INCOMPLETE,
    "active": SubscriptionStatus.ACTIVE,
    "on_hold": SubscriptionStatus.PAST_DUE,
    "cancelled": SubscriptionStatus.CANCELED,
    "failed": SubscriptionStatus.CANCELED,
    "expired": SubscriptionStatus.CANCELED,
}

# What each Dodo subscription status means for data access. This is the
# only thing lead_matching.py, digest_service.py, and
# require_active_subscription actually check.
_CLIENT_STATUS_FOR_SUBSCRIPTION: dict[str, ClientStatus] = {
    "pending": ClientStatus.UNPAID,
    "active": ClientStatus.ACTIVE,
    "on_hold": ClientStatus.PAST_DUE,
    # Initial mandate/payment failed — the subscription never went active,
    # so there's nothing to "cancel"; leave them unpaid so they can just
    # retry checkout.
    "failed": ClientStatus.UNPAID,
    "expired": ClientStatus.CANCELED,
}

_PAYMENT_STATUS_MAP: dict[str, PaymentStatus] = {
    "succeeded": PaymentStatus.SUCCEEDED,
    "failed": PaymentStatus.FAILED,
    "processing": PaymentStatus.PENDING,
    "cancelled": PaymentStatus.FAILED,
}


def _dodo_client() -> DodoPayments:
    if not settings.dodo_payments_api_key:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="payments are not configured (DODO_PAYMENTS_API_KEY missing)",
        )
    return DodoPayments(
        bearer_token=settings.dodo_payments_api_key,
        environment=settings.dodo_payments_environment,
        webhook_key=settings.dodo_payments_webhook_key,
    )


def create_checkout_session(client: Client) -> str:
    """Starts a hosted Dodo Checkout Session for the $199/mo plan, tagged
    with this client's id in metadata. Nothing here grants access — only a
    verified subscription.active webhook does that (see handle_webhook).
    """
    if not settings.dodo_payments_product_id:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="payments are not configured (DODO_PAYMENTS_PRODUCT_ID missing)",
        )
    if client.status == ClientStatus.ACTIVE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="already subscribed")

    dodo = _dodo_client()
    try:
        session = dodo.checkout_sessions.create(
            product_cart=[{"product_id": settings.dodo_payments_product_id, "quantity": 1}],
            customer={"email": client.email, "name": client.contact_name},
            metadata={"client_id": str(client.id)},
            return_url=f"{settings.frontend_url}/payment/return",
        )
    except Exception as exc:
        logger.exception("dodo checkout session creation failed for client %s", client.id)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="failed to start checkout") from exc

    if not session.checkout_url:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, detail="checkout session did not return a URL")
    return session.checkout_url


def _client_id_from_metadata(metadata: dict[str, Any] | None) -> str | None:
    value = (metadata or {}).get("client_id")
    return str(value) if value else None


def _resolve_client_status_for_subscription(subscription_data: Any) -> ClientStatus:
    dodo_status: str = subscription_data.status
    if dodo_status == "cancelled":
        # A scheduled (end-of-period) cancellation keeps access until Dodo
        # fires subscription.expired at the next_billing_date — see the
        # subscription-integration skill's cancel_at_next_billing_date note.
        # An immediate cancellation revokes access right away.
        return ClientStatus.ACTIVE if subscription_data.cancel_at_next_billing_date else ClientStatus.CANCELED
    return _CLIENT_STATUS_FOR_SUBSCRIPTION.get(dodo_status, ClientStatus.UNPAID)


def _apply_subscription_event(session: Session, subscription_data: Any) -> None:
    repos = build_repositories(session)

    existing = repos.subscriptions.get_by_provider_subscription_id(subscription_data.subscription_id)
    client_id = str(existing.client_id) if existing is not None else _client_id_from_metadata(
        subscription_data.metadata
    )
    if client_id is None:
        logger.warning(
            "dodo subscription webhook for %s has no resolvable client_id; dropping",
            subscription_data.subscription_id,
        )
        return

    client = repos.clients.get_by_id(uuid.UUID(client_id))
    if client is None:
        logger.warning("dodo subscription webhook references unknown client %s", client_id)
        return

    repos.subscriptions.upsert_for_client(
        client.id,
        {
            "provider": "dodo",
            "provider_customer_id": subscription_data.customer.customer_id,
            "provider_subscription_id": subscription_data.subscription_id,
            "plan_name": PLAN_NAME,
            "plan_price_cents": subscription_data.recurring_pre_tax_amount,
            "billing_interval": BillingInterval.MONTHLY,
            "status": _SUBSCRIPTION_STATUS_MAP.get(subscription_data.status, SubscriptionStatus.INCOMPLETE),
            "current_period_start": subscription_data.previous_billing_date,
            "current_period_end": subscription_data.next_billing_date,
            "cancel_at_period_end": subscription_data.cancel_at_next_billing_date,
        },
    )

    new_status = _resolve_client_status_for_subscription(subscription_data)
    # Captured before update_flags mutates client.status in place (same
    # session identity map) — otherwise this would always read as "already
    # active" and the welcome email would never fire.
    became_active = new_status == ClientStatus.ACTIVE and client.status != ClientStatus.ACTIVE
    if new_status != client.status:
        repos.clients.update_flags(client.id, is_active=None, is_exclusive=None, status=new_status)
    if became_active:
        _send_welcome_email(client)


def _next_monday(from_date: date) -> date:
    """The upcoming Monday strictly after from_date — matches Service 2's
    weekly digest day (DIGEST_SEND_MODE in app/core/config.py), used in the
    welcome email's "you'll get your first leads starting <date>" line."""
    days_ahead = (7 - from_date.weekday()) % 7 or 7
    return from_date + timedelta(days=days_ahead)


def _send_welcome_email(client: Client) -> None:
    """Sent once, exactly when a client's subscription verifiably becomes
    active — never on signup itself (they haven't paid yet) and never again
    on renewals (see the became_active guard in _apply_subscription_event).
    """
    next_data_date = _next_monday(datetime.now(timezone.utc).date())
    subject, html = build_subscription_welcome_email(client_name=client.contact_name, next_data_date=next_data_date)
    try:
        get_email_sender().send(to=client.email, subject=subject, html=html)
    except Exception:
        # Same reasoning as auth_service.request_password_reset: a delivery
        # failure here shouldn't turn into a failed webhook (which would
        # make Dodo retry the whole event) or undo the status update that
        # already committed — just log it.
        logger.exception("welcome email failed to send for client %s", client.id)


def _apply_payment_event(session: Session, payment_data: Any) -> None:
    repos = build_repositories(session)

    subscription = None
    if payment_data.subscription_id:
        subscription = repos.subscriptions.get_by_provider_subscription_id(payment_data.subscription_id)

    client_id = str(subscription.client_id) if subscription is not None else _client_id_from_metadata(
        payment_data.metadata
    )
    if client_id is None:
        logger.warning("dodo payment webhook %s has no resolvable client_id; dropping", payment_data.payment_id)
        return

    client = repos.clients.get_by_id(uuid.UUID(client_id))
    if client is None:
        return

    payment_status = _PAYMENT_STATUS_MAP.get(payment_data.status or "processing", PaymentStatus.PENDING)
    paid_at = payment_data.created_at if payment_status == PaymentStatus.SUCCEEDED else None

    existing_payment = repos.payments.get_by_provider_payment_id(payment_data.payment_id)
    if existing_payment is not None:
        repos.payments.update_status(existing_payment.id, status=payment_status, paid_at=paid_at)
        return

    repos.payments.create(
        {
            "client_id": client.id,
            "subscription_id": subscription.id if subscription is not None else None,
            "provider_payment_id": payment_data.payment_id,
            "amount_cents": payment_data.total_amount,
            "currency": (payment_data.currency or "USD").lower(),
            "status": payment_status,
            "paid_at": paid_at,
        }
    )


def _apply_refund_event(session: Session, refund_data: Any) -> None:
    repos = build_repositories(session)
    payment = repos.payments.get_by_provider_payment_id(refund_data.payment_id)
    if payment is None:
        logger.warning("dodo refund webhook for unknown payment %s; dropping", refund_data.payment_id)
        return
    repos.payments.update_status(payment.id, status=PaymentStatus.REFUNDED, paid_at=None)


def reconcile_subscription(session: Session, subscription_data: Any) -> None:
    """Applies a Subscription object fetched straight from the Dodo API
    (`dodo.subscriptions.retrieve(...)`) through the exact same logic a
    verified subscription.active/.renewed/etc. webhook would use.

    Recovery path for scripts/reconcile_subscription.py: when a payment
    succeeded on Dodo's side but the corresponding webhook never reached
    (or never got past signature verification in) POST /billing/webhook —
    e.g. DODO_PAYMENTS_WEBHOOK_KEY was misconfigured — this brings the local
    Client/Subscription rows back in sync without a repeat payment. Not for
    use anywhere in the request-handling path; access should only ever be
    granted by handle_webhook.
    """
    _apply_subscription_event(session, subscription_data)


_SUBSCRIPTION_EVENT_TYPES = {
    "subscription.active",
    "subscription.renewed",
    "subscription.on_hold",
    "subscription.cancelled",
    "subscription.expired",
    "subscription.failed",
    # Fires on any field change (quantity, plan, payment method, etc.), not
    # just the status transitions the events above cover. Same Subscription
    # payload shape, and _apply_subscription_event is an idempotent upsert,
    # so routing it through the same handler is a safe way to stay in sync
    # with fields the more specific events don't carry — never a source of
    # incorrect state on its own.
    "subscription.updated",
}
_PAYMENT_EVENT_TYPES = {"payment.succeeded", "payment.failed"}


def handle_webhook(session: Session, *, raw_body: bytes, headers: dict[str, str]) -> None:
    """Verifies the Dodo webhook signature and applies the event. Per the
    webhook-integration skill: signature verification is mandatory, the
    exact raw request bytes are required (no JSON re-serialization), and
    access is only ever granted here — never from the browser's return_url
    redirect (see the /payment/return frontend page, which just polls
    GET /me until this has actually run).
    """
    dodo = _dodo_client()
    try:
        event = dodo.webhooks.unwrap(raw_body.decode("utf-8"), headers=headers)
    except Exception as exc:
        # TEMPORARY: surface the real verification failure instead of just
        # "invalid webhook signature" — remove once the local webhook setup
        # is confirmed working, this shouldn't log to production.
        logger.exception(
            "dodo webhook verification failed; headers=%s body_prefix=%r", headers, raw_body[:500]
        )
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid webhook signature") from exc

    if event.type in _SUBSCRIPTION_EVENT_TYPES:
        _apply_subscription_event(session, event.data)
    elif event.type in _PAYMENT_EVENT_TYPES:
        _apply_payment_event(session, event.data)
    elif event.type == "refund.succeeded":
        _apply_refund_event(session, event.data)
    else:
        logger.info("unhandled dodo webhook event type: %s", event.type)
