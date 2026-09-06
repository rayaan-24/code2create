from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.procedure import VerificationStatus


class ProcedureStepCreate(BaseModel):
    step_number: int
    instruction: str


class ProcedureStepRead(ProcedureStepCreate):
    id: str
    procedure_id: str

    model_config = ConfigDict(from_attributes=True)


class ProcedureRequirementCreate(BaseModel):
    name: str
    description: Optional[str] = None
    required: bool = True


class ProcedureRequirementRead(ProcedureRequirementCreate):
    id: str
    procedure_id: str

    model_config = ConfigDict(from_attributes=True)


class ProcedureBase(BaseModel):
    title: str
    description: str
    category: str = "General"
    service_id: Optional[str] = None
    fee: Optional[str] = None
    estimated_time: Optional[str] = None
    eligibility: Optional[str] = None
    is_active: bool = True


class ProcedureCreate(ProcedureBase):
    steps: Optional[List[ProcedureStepCreate]] = None
    requirements: Optional[List[ProcedureRequirementCreate]] = None


class ProcedureUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    service_id: Optional[str] = None
    fee: Optional[str] = None
    estimated_time: Optional[str] = None
    eligibility: Optional[str] = None
    is_active: Optional[bool] = None


class ProcedureVerifyRequest(BaseModel):
    status: VerificationStatus  # VERIFIED, REJECTED, EXPIRED
    review_due_at: Optional[datetime] = None


class ProcedureRead(ProcedureBase):
    id: str
    community_id: str
    verification_status: VerificationStatus
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    review_due_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    steps: List[ProcedureStepRead] = []
    requirements: List[ProcedureRequirementRead] = []

    model_config = ConfigDict(from_attributes=True)
