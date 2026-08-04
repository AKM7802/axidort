"""Recovery tool: brings a client's subscription status back in sync with
Dodo Payments when a payment succeeded on Dodo's side but the corresponding
webhook never landed (or never passed signature verification) here.

This happens most often during local setup — e.g. DODO_PAYMENTS_WEBHOOK_KEY
in .env is wrong or missing, so every delivery to POST /billing/webhook gets
a 401 and the client is stuck at status=unpaid even though Dodo shows the
subscription as Active. See PAYMENTS.md's Troubleshooting section for how to
recognize this situation before reaching for this script.

Fetches the authoritative Subscription object straight from the Dodo API and
runs it through app.services.billing_service.reconcile_subscription(), the
exact same code a verified webhook would use — so the result is identical to
what would have happened had the webhook been delivered successfully. This
does NOT create a new payment or charge anything; it only reads Dodo's
existing state and reflects it locally.

This is a manual recovery tool, not a normal part of the payment flow —
outside of this script, a client's status should only ever change via
POST /billing/webhook (see billing_service.handle_webhook). If you find
yourself running this often, the real fix is to correct your webhook setup
(DODO_PAYMENTS_WEBHOOK_KEY, endpoint URL, or the dodo wh listen tunnel),
not to keep reconciling by hand.

Usage:
    # Look up the subscription id (sub_...) on the Dodo dashboard's
    # Subscribers tab, or from a checkout_session_id via
    # dodo.checkout_sessions.retrieve(...).subscription_id.

    # Preview what would be applied, without writing to the database:
    PYTHONPATH=. python3 scripts/reconcile_subscription.py sub_xxxxxxxxxxxx --dry-run

    # Apply it:
    PYTHONPATH=. python3 scripts/reconcile_subscription.py sub_xxxxxxxxxxxx
"""
import argparse
import sys

from dodopayments import DodoPayments

from app.core.config import settings
from app.db.session import SessionLocal
from app.services import billing_service


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "subscription_id",
        help="Dodo subscription id, e.g. sub_xxxxxxxxxxxx (Dodo dashboard -> Subscribers tab).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Fetch and print the subscription's current state without writing to the database.",
    )
    args = parser.parse_args()

    if not settings.dodo_payments_api_key:
        sys.exit("DODO_PAYMENTS_API_KEY is not set in .env — can't call the Dodo API.")

    dodo = DodoPayments(
        bearer_token=settings.dodo_payments_api_key,
        environment=settings.dodo_payments_environment,
    )

    print(f"Fetching {args.subscription_id} from Dodo ({settings.dodo_payments_environment})...")
    try:
        subscription = dodo.subscriptions.retrieve(args.subscription_id)
    except Exception as exc:
        sys.exit(f"Could not fetch subscription: {exc}")

    client_id = (subscription.metadata or {}).get("client_id")
    print(f"  status:             {subscription.status}")
    print(f"  metadata.client_id: {client_id!r}")
    print(f"  customer:           {subscription.customer.email} ({subscription.customer.customer_id})")
    print(f"  recurring amount:   {subscription.recurring_pre_tax_amount} {subscription.currency}")
    print(f"  current period:     {subscription.previous_billing_date} -> {subscription.next_billing_date}")
    print(f"  cancel at period end: {subscription.cancel_at_next_billing_date}")

    if not client_id:
        sys.exit(
            "\nThis subscription has no metadata.client_id, so there's no way to tell which "
            "local client it belongs to. It probably wasn't created through this app's "
            "POST /billing/checkout-session (billing_service.create_checkout_session always "
            "sets that metadata) — nothing to reconcile automatically."
        )

    if args.dry_run:
        print("\n--dry-run: not writing to the database. Re-run without --dry-run to apply.")
        return

    session = SessionLocal()
    try:
        billing_service.reconcile_subscription(session, subscription)
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()

    print(f"\nApplied. Client {client_id} is now in sync with Dodo's subscription status ({subscription.status}).")


if __name__ == "__main__":
    main()
