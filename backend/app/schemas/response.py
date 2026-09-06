from typing import Generic, TypeVar, Optional, Any, Dict
from pydantic import BaseModel

T = TypeVar("T")


class MetaPagination(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class ResponseEnvelope(BaseModel, Generic[T]):
    data: T
    meta: Optional[Dict[str, Any]] = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Any] = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail
