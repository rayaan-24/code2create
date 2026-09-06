from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


class ToolCall(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tool_name: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    call_id: Optional[str] = None


class ToolResult(BaseModel):
    model_config = ConfigDict(extra="ignore")

    tool_name: str
    status: str = "success"  # "success" or "error"
    data: Any = None
    error: Optional[str] = None
    execution_time_ms: float = 0.0
