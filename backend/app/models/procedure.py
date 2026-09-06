import uuid
from datetime import datetime, timezone
from enum import Enum
from sqlalchemy import String, DateTime, Boolean, Integer, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    EXPIRED = "EXPIRED"
    REJECTED = "REJECTED"


class Procedure(Base):
    __tablename__ = "procedures"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    community_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("communities.id", ondelete="CASCADE"), index=True, nullable=False
    )
    service_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("services.id", ondelete="SET NULL"), index=True, nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(128), default="General", index=True)
    fee: Mapped[str] = mapped_column(String(64), nullable=True)
    estimated_time: Mapped[str] = mapped_column(String(128), nullable=True)
    eligibility: Mapped[str] = mapped_column(Text, nullable=True)

    # Verification state
    verification_status: Mapped[VerificationStatus] = mapped_column(
        SQLEnum(VerificationStatus),
        nullable=False,
        default=VerificationStatus.PENDING,
        index=True,
    )
    verified_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    verified_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    review_due_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

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
    service: Mapped["Service"] = relationship("Service", back_populates="procedures")
    steps: Mapped[list["ProcedureStep"]] = relationship(
        "ProcedureStep",
        back_populates="procedure",
        order_by="ProcedureStep.step_number",
        cascade="all, delete-orphan",
    )
    requirements: Mapped[list["ProcedureRequirement"]] = relationship(
        "ProcedureRequirement", back_populates="procedure", cascade="all, delete-orphan"
    )


class ProcedureStep(Base):
    __tablename__ = "procedure_steps"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    procedure_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("procedures.id", ondelete="CASCADE"), index=True, nullable=False
    )
    step_number: Mapped[int] = mapped_column(Integer, nullable=False)
    instruction: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    procedure: Mapped["Procedure"] = relationship("Procedure", back_populates="steps")


class ProcedureRequirement(Base):
    __tablename__ = "procedure_requirements"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    procedure_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("procedures.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    required: Mapped[bool] = mapped_column(Boolean, default=True)

    procedure: Mapped["Procedure"] = relationship("Procedure", back_populates="requirements")
