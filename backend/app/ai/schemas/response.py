from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ActionType(str, Enum):
    NAVIGATE = "NAVIGATE"
    VIEW_SOURCE = "VIEW_SOURCE"
    START_PROCEDURE = "START_PROCEDURE"
    CONTACT_PERSON = "CONTACT_PERSON"
    VIEW_SERVICE = "VIEW_SERVICE"
    OPEN_WEB_SOURCE = "OPEN_WEB_SOURCE"


class ActionItem(BaseModel):
    model_config = ConfigDict(extra="ignore")

    type: ActionType
    label: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class SourceAttribution(BaseModel):
    model_config = ConfigDict(extra="ignore")

    source_id: str
    title: str
    source_document: str
    page_or_section: Optional[str] = None
    confidence_score: float = 1.0
    verified: bool = True
    verified_at: Optional[str] = None


class AIResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")

    answer: str
    intent: str = "QUESTION"
    actions: List[ActionItem] = Field(default_factory=list)
    sources: List[SourceAttribution] = Field(default_factory=list)
    external_sources: List[Dict[str, Any]] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    structured_card: Optional[Dict[str, Any]] = None
    is_external: bool = False
    requires_navigation: bool = False
    requires_clarification: bool = False
    debug_info: Optional[Dict[str, Any]] = None
