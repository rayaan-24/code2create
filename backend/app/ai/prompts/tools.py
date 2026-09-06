TOOL_SELECTION_PROMPT = """Given the user query, conversational state, and available tools, determine if a tool needs to be called to fetch structured data or execute an action.

AVAILABLE TOOLS:
- get_procedure(procedure_title: str)
- get_location(query: str)
- get_person(name_or_role: str)
- get_service(service_name: str)
- get_announcement(query: Optional[str])
- calculate_route(start_location: str, destination: str)

CONVERSATION STATE:
{conversation_state}

USER QUERY:
"{user_query}"

If a tool call is needed, return a JSON object:
{{
  "call_tool": true,
  "tool_name": "<tool_name>",
  "arguments": {{ ... }}
}}

If no tool call is needed, return:
{{
  "call_tool": false
}}
"""
