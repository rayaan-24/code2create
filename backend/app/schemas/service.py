from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ServiceHoursBase(BaseModel):
    day_of_week: int  # 0=Monday, 6=Sunday
    open_time: Optional[str] = None
    close_time: Optional[str] = None
    is_closed: bool = False


class ServiceHoursCreate(ServiceHoursBase):
    pass


class ServiceHoursRead(ServiceHoursBase):
    id: str
    service_id: str

    model_config = ConfigDict(from_attributes=True)


class ServiceBase(BaseModel):
    name: str
    description: str
    department: str
    category: str = "General"
    location_id: Optional[str] = None
    contact: Optional[str] = None
    website: Optional[str] = None
    is_urgent: bool = False
    is_active: bool = True


class ServiceCreate(ServiceBase):
    hours: Optional[List[ServiceHoursCreate]] = None


class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    department: Optional[str] = None
    category: Optional[str] = None
    location_id: Optional[str] = None
    contact: Optional[str] = None
    website: Optional[str] = None
    is_urgent: Optional[bool] = None
    is_active: Optional[bool] = None


class ServiceRead(ServiceBase):
    id: str
    community_id: str
    created_at: datetime
    updated_at: datetime
    hours: List[ServiceHoursRead] = []

    model_config = ConfigDict(from_attributes=True)
