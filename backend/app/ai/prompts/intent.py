INTENT_CLASSIFICATION_PROMPT = """Analyze the following user message to determine its intent and required capabilities.
Nexora is a Hybrid AI Organization & Society Assistant. It can answer organization-specific questions, general knowledge, coding, writing/creative requests, live web information, and campus navigation.

VALID INTENTS:
- ORGANIZATION_KNOWLEDGE: Questions specifically about the organization/campus (e.g., SJT-G12, TT-402, ID card replacement, campus library opening hours, campus dean, campus rules).
- GENERAL_KNOWLEDGE: General factual/conceptual questions that do not require organization documents (e.g., "What is quantum computing?", "Explain OSI model", "What is blockchain?", "How does a neural network work?").
- CODING: Programming questions, syntax, debugging, algorithms, architecture comparisons (e.g., "Explain Python decorators", "Write a Python script to sort a list", "PostgreSQL vs MongoDB", "Difference between TCP and UDP").
- CREATIVE: Drafting text, emails, essays, brainstorming (e.g., "Write an email asking for an extension", "Give me 5 startup ideas").
- EDUCATION: Step-by-step tutoring, academic concept explanations (e.g., "Explain recursion simply").
- WEB_SEARCH: Queries requiring current, latest, live, or real-time external info (e.g., "What is the latest AI news?", "Who is the current CEO of Microsoft/NVIDIA?", "Who won yesterday's match?").
- LOCATION: Looking for a specific physical place or room on campus (e.g., "Where is SJT-G12?", "Where is the central library?").
- NAVIGATION: Asking for route directions or walking time (e.g., "How do I get to TT from SJT?", "How long does it take to walk to library?").
- MULTI_TOOL: Queries requiring multiple sources or tools together (e.g., "Tell me where the library is and give me directions").
- PROCEDURE: Formal institutional steps/guidelines (e.g., "How do I replace my ID card?", "Leave application procedure").
- PERSON_LOOKUP: Looking for an organization member/faculty.
- SERVICE_LOOKUP: Looking for an organization facility/clinic/IT desk.
- GENERAL_CHAT: Greetings and pleasantries ("hello", "thanks", "who are you").
- EMERGENCY: Urgent campus safety/medical issues.

ACTIVE CONVERSATION STATE:
{conversation_state}

USER MESSAGE:
"{user_message}"

CRITICAL RULES:
1. ONLY set `needs_retrieval: true` if the question specifically pertains to the organization's internal facilities, policies, personnel, or documents.
2. For general knowledge, coding, creative, educational, or web search queries, set `needs_retrieval: false`.
3. For queries requiring current/latest information, set `needs_tool: true` and `target_tool: "search_web"`.

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
  "needs_retrieval": false,
  "needs_tool": false,
  "target_tool": null,
  "tools_required": [],
  "clarification_needed": null
}}
"""
