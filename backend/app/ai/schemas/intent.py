from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field, ConfigDict


class IntentType(str, Enum):
    QUESTION = "QUESTION"
    PROCEDURE = "PROCEDURE"
    LOCATION = "LOCATION"
    NAVIGATION = "NAVIGATION"
    PERSON_LOOKUP = "PERSON_LOOKUP"
    SERVICE_LOOKUP = "SERVICE_LOOKUP"
    ANNOUNCEMENT = "ANNOUNCEMENT"
    EMERGENCY = "EMERGENCY"
    REQUEST = "REQUEST"
    GENERAL_CHAT = "GENERAL_CHAT"
    UNKNOWN = "UNKNOWN"


class ExtractedEntities(BaseModel):
    model_config = ConfigDict(extra="ignore")

    person_name: Optional[str] = None
    department: Optional[str] = None
    building: Optional[str] = None
    room: Optional[str] = None
    service: Optional[str] = None
    procedure: Optional[str] = None
    document: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    location: Optional[str] = None
    organization: Optional[str] = None
    query_term: Optional[str] = None


class IntentClassificationResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    intent: IntentType = IntentType.QUESTION
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)
    entities: ExtractedEntities = Field(default_factory=ExtractedEntities)
    needs_retrieval: bool = True
    needs_tool: bool = False
    target_tool: Optional[str] = None
    clarification_needed: Optional[str] = None
