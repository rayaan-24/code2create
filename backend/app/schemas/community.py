from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.community import CommunityType


class BuildingCreate(BaseModel):
    name: str
    code: Optional[str] = None
    description: Optional[str] = None


class BuildingRead(BaseModel):
    id: str
    community_id: str
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CommunityCreate(BaseModel):
    name: str
    type: CommunityType = CommunityType.UNIVERSITY
    description: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: str = "UTC"


class CommunityRead(BaseModel):
    id: str
    name: str
    type: CommunityType
    description: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: str
    is_active: bool
    created_at: datetime
    buildings: List[BuildingRead] = []

    model_config = ConfigDict(from_attributes=True)


class CommunityUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[CommunityType] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    timezone: Optional[str] = None
    is_active: Optional[bool] = None
