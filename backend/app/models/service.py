import uuid
from datetime import datetime, timezone
from sqlalchemy import String, DateTime, Boolean, Integer, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Service(Base):
    __tablename__ = "services"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    community_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("communities.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    department: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(128), default="General", index=True)

    location_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("locations.id", ondelete="SET NULL"), index=True, nullable=True
    )
    contact: Mapped[str] = mapped_column(String(255), nullable=True)
    website: Mapped[str] = mapped_column(String(512), nullable=True)
    is_urgent: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    community: Mapped["Community"] = relationship("Community", back_populates="services")
    location: Mapped["Location"] = relationship("Location", back_populates="services")
    hours: Mapped[list["ServiceHours"]] = relationship(
        "ServiceHours", back_populates="service", cascade="all, delete-orphan"
    )
    procedures: Mapped[list["Procedure"]] = relationship("Procedure", back_populates="service")


class ServiceHours(Base):
    __tablename__ = "service_hours"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    service_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("services.id", ondelete="CASCADE"), index=True, nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    open_time: Mapped[str] = mapped_column(String(16), nullable=True)   # "09:00"
    close_time: Mapped[str] = mapped_column(String(16), nullable=True)  # "17:00"
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False)

    service: Mapped["Service"] = relationship("Service", back_populates="hours")
