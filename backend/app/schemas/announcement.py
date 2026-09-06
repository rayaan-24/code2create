from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.models.announcement import AnnouncementPriority


class AnnouncementBase(BaseModel):
    title: str
    content: str
    category: str = "General"
    priority: AnnouncementPriority = AnnouncementPriority.NORMAL
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_active: bool = True


class AnnouncementCreate(AnnouncementBase):
    pass


class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[AnnouncementPriority] = None
    expires_at: Optional[datetime] = None
    is_active: Optional[bool] = None


class AnnouncementRead(AnnouncementBase):
    id: str
    community_id: str
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
