from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ConversationState(BaseModel):
    model_config = ConfigDict(extra="ignore")

    community_id: str
    active_intent: Optional[str] = None
    active_entity: Optional[str] = None
    current_destination: Optional[str] = None
    current_location: Optional[str] = None
    last_office: Optional[str] = None
    last_person: Optional[str] = None
    last_service: Optional[str] = None
    last_procedure: Optional[str] = None
    last_tool_name: Optional[str] = None
    last_tool_result: Optional[Dict[str, Any]] = None
    last_source_ids: List[str] = Field(default_factory=list)
    summary: Optional[str] = None
