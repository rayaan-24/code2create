from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.core.config import settings
from app.models.user import User, UserRole
from app.models.community import Community, CommunityType
from app.models.audit import AuditAction
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse
from app.services.audit_service import log_audit_event


def register_user(
    db: Session,
    request: RegisterRequest,
    ip_address: str = "127.0.0.1",
) -> tuple[User, TokenResponse]:
    # Check if user already exists
    existing = db.query(User).filter(User.email == request.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "DUPLICATE_RESOURCE", "message": "Email address is already registered"},
        )

    # Validate role - public registration cannot create ADMIN or SUPER_ADMIN
    requested_role_str = request.role.upper()
    if requested_role_str in ["ADMIN", "SUPER_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCESS_DENIED",
                "message": "Administrative accounts cannot be registered publicly",
            },
        )

    try:
        user_role = UserRole[requested_role_str]
    except KeyError:
        user_role = UserRole.USER

    # Find or create default community
    community = db.query(Community).filter(Community.name == request.community_name).first()
    if not community:
        community = Community(
            name=request.community_name,
            type=CommunityType.UNIVERSITY,
            description="Default community auto-provisioned during initial registration",
        )
        db.add(community)
        db.commit()
        db.refresh(community)

    # Hash password securely
    hashed = hash_password(request.password)

    new_user = User(
        community_id=community.id,
        name=request.name,
        email=request.email.lower(),
        password_hash=hashed,
        role=user_role,
        department=request.department,
        year=request.year,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Audit log
    log_audit_event(
        db=db,
        community_id=community.id,
        user_id=new_user.id,
        action=AuditAction.CREATE,
        entity_type="user",
        entity_id=new_user.id,
        metadata_json={"role": new_user.role.value, "registration": True},
        ip_address=ip_address,
    )

    # Generate JWT pair
    access_token = create_access_token(
        subject=new_user.id,
        community_id=community.id,
        role=new_user.role.value,
    )
    refresh_token = create_refresh_token(
        subject=new_user.id,
        community_id=community.id,
        role=new_user.role.value,
    )

    tokens = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return new_user, tokens


def authenticate_user(
    db: Session,
    request: LoginRequest,
    ip_address: str = "127.0.0.1",
) -> tuple[User, TokenResponse]:
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={
                "code": "INVALID_CREDENTIALS",
                "message": "Incorrect email or password",
            },
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "INACTIVE_USER", "message": "User account is suspended"},
        )

    # Update last login timestamp
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()

    # Audit log
    log_audit_event(
        db=db,
        community_id=user.community_id,
        user_id=user.id,
        action=AuditAction.LOGIN,
        entity_type="session",
        metadata_json={"email": user.email},
        ip_address=ip_address,
    )

    access_token = create_access_token(
        subject=user.id,
        community_id=user.community_id,
        role=user.role.value,
    )
    refresh_token = create_refresh_token(
        subject=user.id,
        community_id=user.community_id,
        role=user.role.value,
    )

    tokens = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return user, tokens


def issue_guest_token(db: Session) -> tuple[User, TokenResponse]:
    demo_user = db.query(User).filter(User.email == "alex.rivera@nexora.edu").first()
    if not demo_user:
        demo_user = db.query(User).filter(User.is_active == True).first()
    if not demo_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NO_GUEST_ACCOUNT", "message": "No active user available for guest session"},
        )

    access_token = create_access_token(
        subject=demo_user.id,
        community_id=demo_user.community_id,
        role=demo_user.role.value,
    )
    refresh_token = create_refresh_token(
        subject=demo_user.id,
        community_id=demo_user.community_id,
        role=demo_user.role.value,
    )

    tokens = TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )

    return demo_user, tokens


def refresh_access_token(db: Session, refresh_token: str) -> TokenResponse:
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Invalid or expired refresh token"},
        )

    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "User no longer eligible"},
        )

    access_token = create_access_token(
        subject=user.id,
        community_id=user.community_id,
        role=user.role.value,
    )
    new_refresh_token = create_refresh_token(
        subject=user.id,
        community_id=user.community_id,
        role=user.role.value,
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
