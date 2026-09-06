INTENT_CLASSIFICATION_PROMPT = """Analyze the following user message in the context of our closed community.
Classify the user intent and extract any relevant community entities.

VALID INTENTS:
- QUESTION: Asking a specific factual question about the community.
- PROCEDURE: Steps, guidelines, requirements, fees, or paperwork needed for a process (e.g. ID card replacement, leave request, bonafide certificate).
- LOCATION: Asking where a physical room, hall, building, or landmark is located.
- NAVIGATION: Asking how to get from point A to point B or how long it takes.
- PERSON_LOOKUP: Looking for a professor, dean, staff member, or contact.
- SERVICE_LOOKUP: Inquiring about a campus facility, clinic, IT desk, or operational service.
- ANNOUNCEMENT: Asking about upcoming events, campus alerts, closures, or notices.
- EMERGENCY: Urgent medical, fire, safety, or security emergency.
- REQUEST: Action request or greeting.
- GENERAL_CHAT: Conversational pleasantries ("hello", "thank you", "who are you").
- UNKNOWN: Out of scope or completely external request.

ACTIVE CONVERSATION STATE:
{conversation_state}

USER MESSAGE:
"{user_message}"

Respond strictly with a JSON object matching this schema:
{{
  "intent": "<ONE_OF_THE_VALID_INTENTS>",
  "confidence": 0.95,
  "entities": {{
    "person_name": null,
    "department": null,
    "building": null,
    "room": null,
    "service": null,
    "procedure": null,
    "document": null,
    "location": null,
    "query_term": null
  }},
  "needs_retrieval": true,
  "needs_tool": false,
  "target_tool": null,
  "clarification_needed": null
}}
"""
