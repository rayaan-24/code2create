from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr


class PersonBase(BaseModel):
    name: str
    role: str
    department: str
    email: EmailStr
    phone: Optional[str] = None
    location_id: Optional[str] = None
    description: Optional[str] = None
    office_hours: Optional[str] = None
    availability: str = "Available"
    avatar_url: Optional[str] = None
    is_active: bool = True


class PersonCreate(PersonBase):
    pass


class PersonUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location_id: Optional[str] = None
    description: Optional[str] = None
    office_hours: Optional[str] = None
    availability: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = None


class PersonRead(PersonBase):
    id: str
    community_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
