from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class LocationBase(BaseModel):
    name: str
    building_id: Optional[str] = None
    room_number: Optional[str] = None
    floor: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    x_coordinate: Optional[float] = None
    y_coordinate: Optional[float] = None
    location_type: str = "room"
    is_accessible: bool = True


class LocationCreate(LocationBase):
    pass


class LocationUpdate(BaseModel):
    name: Optional[str] = None
    building_id: Optional[str] = None
    room_number: Optional[str] = None
    floor: Optional[str] = None
    description: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    x_coordinate: Optional[float] = None
    y_coordinate: Optional[float] = None
    location_type: Optional[str] = None
    is_accessible: Optional[bool] = None


class LocationRead(LocationBase):
    id: str
    community_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
