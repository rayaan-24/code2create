from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.user import UserRead, UserUpdate
from app.schemas.response import ResponseEnvelope

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=ResponseEnvelope[UserRead])
def get_user_me(current_user: User = Depends(get_current_user)):
    return ResponseEnvelope(data=UserRead.model_validate(current_user))


@router.put("/me", response_model=ResponseEnvelope[UserRead])
def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    update_data = user_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return ResponseEnvelope(data=UserRead.model_validate(current_user))
