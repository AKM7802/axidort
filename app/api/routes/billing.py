from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_client, get_db_session
from app.models.client import Client
from app.schemas.billing import CheckoutSessionOut
from app.services import billing_service

router = APIRouter(prefix="/billing", tags=["billing"])


@router.post("/checkout-session", response_model=CheckoutSessionOut)
def create_checkout_session(client: Client = Depends(get_current_client)) -> CheckoutSessionOut:
    checkout_url = billing_service.create_checkout_session(client)
    return CheckoutSessionOut(checkout_url=checkout_url)


@router.post("/webhook", status_code=status.HTTP_204_NO_CONTENT)
async def dodo_webhook(request: Request, session: Session = Depends(get_db_session)) -> None:
    """No auth — Dodo calls this directly. Trust boundary is the webhook
    signature verified inside billing_service.handle_webhook, not bearer
    auth. Raw bytes (not request.json()) are required: signature
    verification hashes the exact bytes Dodo sent, and re-serializing JSON
    would produce a different byte string and fail verification.
    """
    raw_body = await request.body()
    billing_service.handle_webhook(
        session,
        raw_body=raw_body,
        headers={
            "webhook-id": request.headers.get("webhook-id", ""),
            "webhook-signature": request.headers.get("webhook-signature", ""),
            "webhook-timestamp": request.headers.get("webhook-timestamp", ""),
        },
    )
