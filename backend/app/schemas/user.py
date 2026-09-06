from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.user import UserRole


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    community_id: str
    name: str
    email: EmailStr
    role: UserRole
    department: Optional[str] = None
    year: Optional[str] = None
    is_active: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    year: Optional[str] = None


class UserCreateAdmin(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole
    department: Optional[str] = None
    year: Optional[str] = None
