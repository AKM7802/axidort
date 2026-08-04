from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db_session
from app.schemas.auth import (
    AuthResponse,
    ClientOut,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    SigninRequest,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signin", response_model=AuthResponse)
def signin(payload: SigninRequest, session: Session = Depends(get_db_session)) -> AuthResponse:
    client, token = auth_service.signin(session, email=payload.email, password=payload.password)
    return AuthResponse(access_token=token, client=ClientOut.model_validate(client))


@router.post("/forgot-password", status_code=status.HTTP_204_NO_CONTENT)
def forgot_password(payload: ForgotPasswordRequest, session: Session = Depends(get_db_session)) -> None:
    """Always 204 regardless of whether the email is registered — see
    auth_service.request_password_reset for why."""
    auth_service.request_password_reset(session, email=payload.email)


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_password(payload: ResetPasswordRequest, session: Session = Depends(get_db_session)) -> None:
    auth_service.reset_password(session, token=payload.token, new_password=payload.new_password)
