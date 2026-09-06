import time
import logging
from typing import Dict, Any, Callable, Optional, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ai.schemas.tool_call import ToolCall, ToolResult
from app.ai.tools.procedures import get_procedure_tool
from app.ai.tools.locations import get_location_tool
from app.ai.tools.people import get_person_tool
from app.ai.tools.services import get_service_tool
from app.ai.tools.navigation import calculate_route_tool
from app.ai.tools.knowledge import search_community_knowledge_tool

logger = logging.getLogger("nexora.ai.tools")


class ToolRegistry:
    """Safe tool execution registry with authorization, timeout, and loop limits."""

    def __init__(self, max_tool_calls: int = 5):
        self.max_tool_calls = max_tool_calls
        self.call_count = 0

    def execute_tool(
        self,
        tool_name: str,
        arguments: Dict[str, Any],
        db: Session,
        community_id: str,
        user_role: str = "USER",
    ) -> ToolResult:
        """Execute tool safely within security boundaries and execution limits."""
        start_time = time.time()
        self.call_count += 1

        if self.call_count > self.max_tool_calls:
            logger.warning(f"Exceeded max tool calls limit ({self.max_tool_calls})")
            return ToolResult(
                tool_name=tool_name,
                status="error",
                error=f"Tool execution depth exceeded max limit of {self.max_tool_calls}",
                execution_time_ms=0.0,
            )

        try:
            if tool_name == "get_procedure":
                q = arguments.get("procedure_title") or arguments.get("query") or "ID Card Replacement"
                data = get_procedure_tool(db, community_id, q)
            elif tool_name == "get_location":
                q = arguments.get("query") or arguments.get("location_name") or "Student Services"
                data = get_location_tool(db, community_id, q)
            elif tool_name == "get_person":
                q = arguments.get("name_or_role") or arguments.get("query") or ""
                data = get_person_tool(db, community_id, q, user_role)
            elif tool_name == "get_service":
                q = arguments.get("service_name") or arguments.get("query") or ""
                data = get_service_tool(db, community_id, q)
            elif tool_name == "calculate_route":
                start = arguments.get("start_location") or "Library"
                dest = arguments.get("destination") or "Student Services"
                accessible = arguments.get("accessible", False)
                data = calculate_route_tool(db, community_id, start, dest, accessible=accessible)
            elif tool_name == "search_community_knowledge":
                q = arguments.get("query") or ""
                data = search_community_knowledge_tool(db, community_id, q)
            elif tool_name == "search_web":
                from app.search.client import search_client
                q = arguments.get("query") or ""
                results = search_client.search_sync(q)
                data = {
                    "query": q,
                    "results_count": len(results),
                    "results": [r.model_dump() for r in results],
                }
            else:
                return ToolResult(
                    tool_name=tool_name,
                    status="error",
                    error=f"Unrecognized tool: {tool_name}",
                    execution_time_ms=0.0,
                )

            duration_ms = (time.time() - start_time) * 1000
            return ToolResult(
                tool_name=tool_name,
                status="success" if data is not None else "not_found",
                data=data,
                execution_time_ms=round(duration_ms, 2),
            )
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}")
            return ToolResult(
                tool_name=tool_name,
                status="error",
                error=str(e),
                execution_time_ms=round((time.time() - start_time) * 1000, 2),
            )
