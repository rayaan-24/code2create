import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, Float, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    community_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("communities.id", ondelete="CASCADE"), index=True, nullable=False
    )
    building_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("buildings.id", ondelete="SET NULL"), index=True, nullable=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    room_number: Mapped[str] = mapped_column(String(64), nullable=True)
    floor: Mapped[str] = mapped_column(String(64), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Coordinates for GIS and Indoor Maps
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    x_coordinate: Mapped[float] = mapped_column(Float, nullable=True)
    y_coordinate: Mapped[float] = mapped_column(Float, nullable=True)

    location_type: Mapped[str] = mapped_column(String(64), default="room")
    is_accessible: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    community: Mapped["Community"] = relationship("Community", back_populates="locations")
    building: Mapped["Building"] = relationship("Building", back_populates="locations")
    people: Mapped[list["Person"]] = relationship("Person", back_populates="location")
    services: Mapped[list["Service"]] = relationship("Service", back_populates="location")
