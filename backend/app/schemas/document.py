from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.procedure import VerificationStatus


class DocumentVersionRead(BaseModel):
    id: str
    document_id: str
    version_number: int
    file_name: str
    storage_key: Optional[str] = None
    uploaded_by: Optional[str] = None
    change_summary: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentBase(BaseModel):
    title: str
    description: Optional[str] = None
    file_name: str
    file_type: str
    storage_key: Optional[str] = None
    source_url: Optional[str] = None
    is_active: bool = True


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    source_url: Optional[str] = None
    is_active: Optional[bool] = None


class DocumentUploadNewVersion(BaseModel):
    file_name: str
    file_type: Optional[str] = None
    storage_key: Optional[str] = None
    change_summary: str


class DocumentVerifyRequest(BaseModel):
    status: VerificationStatus
    review_due_at: Optional[datetime] = None


class DocumentRead(DocumentBase):
    id: str
    community_id: str
    version: int
    uploaded_by: Optional[str] = None
    verification_status: VerificationStatus
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    review_due_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    versions: List[DocumentVersionRead] = []

    model_config = ConfigDict(from_attributes=True)


class DocumentIngestionResponse(BaseModel):
    document_id: str
    title: str
    file_name: str
    file_size_bytes: int
    storage_key: str
    file_checksum: str
    pages_parsed: int
    chunks_created: int
    verification_status: str
    message: str = "Document successfully ingested and indexed"

    model_config = ConfigDict(from_attributes=True)
