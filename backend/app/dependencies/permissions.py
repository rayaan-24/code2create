from fastapi import Depends, HTTPException, status
from app.dependencies.auth import get_current_user
from app.models.user import User, UserRole


def require_authenticated_user(current_user: User = Depends(get_current_user)) -> User:
    return current_user


def require_staff_or_admin(current_user: User = Depends(get_current_user)) -> User:
    allowed_roles = {UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCESS_DENIED",
                "message": "Staff or Administrative permissions required",
            },
        )
    return current_user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    allowed_roles = {UserRole.ADMIN, UserRole.SUPER_ADMIN}
    if current_user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCESS_DENIED",
                "message": "Administrative privileges required for this action",
            },
        )
    return current_user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCESS_DENIED",
                "message": "Super Administrator authorization required",
            },
        )
    return current_user


def verify_community_access(current_user: User, community_id: str):
    """
    Guarantees community isolation.
    If the user is not a SUPER_ADMIN, they can only access resources within their own community.
    """
    if current_user.role == UserRole.SUPER_ADMIN:
        return
    if current_user.community_id != community_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "COMMUNITY_ACCESS_DENIED",
                "message": "Cross-community access is strictly prohibited",
            },
        )
