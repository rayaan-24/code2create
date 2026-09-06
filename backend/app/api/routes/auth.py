from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.audit import AuditAction
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshTokenRequest,
)
from app.schemas.user import UserRead
from app.schemas.response import ResponseEnvelope
from app.services.auth_service import (
    register_user,
    authenticate_user,
    refresh_access_token,
)
from app.services.audit_service import log_audit_event

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=ResponseEnvelope[dict])
def register(
    request: RegisterRequest,
    req: Request,
    db: Session = Depends(get_db),
):
    client_ip = req.client.host if req.client else "127.0.0.1"
    user, tokens = register_user(db, request, ip_address=client_ip)
    return ResponseEnvelope(
        data={
            "user": UserRead.model_validate(user).model_dump(),
            "tokens": tokens.model_dump(),
        }
    )


@router.post("/login", response_model=ResponseEnvelope[dict])
def login(
    request: LoginRequest,
    req: Request,
    db: Session = Depends(get_db),
):
    client_ip = req.client.host if req.client else "127.0.0.1"
    user, tokens = authenticate_user(db, request, ip_address=client_ip)
    return ResponseEnvelope(
        data={
            "user": UserRead.model_validate(user).model_dump(),
            "tokens": tokens.model_dump(),
        }
    )


@router.post("/refresh", response_model=ResponseEnvelope[TokenResponse])
def refresh(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    tokens = refresh_access_token(db, request.refresh_token)
    return ResponseEnvelope(data=tokens)


@router.get("/me", response_model=ResponseEnvelope[UserRead])
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    return ResponseEnvelope(data=UserRead.model_validate(current_user))


@router.post("/logout", response_model=ResponseEnvelope[dict])
def logout(
    req: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    client_ip = req.client.host if req.client else "127.0.0.1"
    log_audit_event(
        db=db,
        community_id=current_user.community_id,
        user_id=current_user.id,
        action=AuditAction.LOGOUT,
        entity_type="session",
        metadata_json={"email": current_user.email},
        ip_address=client_ip,
    )
    return ResponseEnvelope(data={"message": "Logged out successfully"})
