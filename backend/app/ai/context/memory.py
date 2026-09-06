import re
import logging
from typing import Optional, Tuple
from app.ai.context.state import ConversationState

logger = logging.getLogger("nexora.ai.context")


class ConversationMemory:
    """
    Manages short-term conversation memory and anaphora/pronoun resolution.
    Resolves references like "it", "that office", "there", "how long will it take".
    """

    @staticmethod
    def resolve_references(query: str, state: ConversationState) -> Tuple[str, ConversationState]:
        """
        Check if query contains contextual pronouns and expand with resolved entities.
        Returns (augmented_query, updated_state).
        """
        query_lower = query.lower().strip()
        updated_state = state.model_copy()

        # 1. Location update detection: "I'm near the library", "I am at SJT", "standing by library"
        loc_match = re.search(
            r"(?:i'?m|i am|standing|currently|located|near|at|by)\s+(?:the\s+)?([A-Za-z0-9\s\-]+?)(?:\.|$|,|and)",
            query_lower,
        )
        if loc_match and any(term in query_lower for term in ["near", "at", "by", "from", "standing"]):
            candidate = loc_match.group(1).strip().title()
            if candidate and len(candidate) > 2 and candidate not in ["Here", "There", "The"]:
                updated_state.current_location = candidate
                logger.info(f"Updated user current_location in state: {candidate}")

        # 2. Pronoun / follow-up reference resolution:
        # e.g. "Where is that office?", "Where is it?", "How do I get there?"
        is_where_followup = any(
            pattern in query_lower
            for pattern in ["where is that office", "where is that", "where is it", "where is the office", "how do i get there"]
        )

        if is_where_followup:
            target = state.current_destination or state.last_office or state.last_service or "Student Services"
            augmented = f"Where is {target}?"
            logger.info(f"Resolved reference '{query}' to '{augmented}'")
            return augmented, updated_state

        # 3. ETA / Duration follow-up: "How long will it take?", "How long does it take?"
        is_eta_followup = any(
            pattern in query_lower
            for pattern in ["how long will it take", "how long does it take", "how long to reach", "how much time"]
        )

        if is_eta_followup:
            origin = updated_state.current_location or "Library"
            dest = updated_state.current_destination or updated_state.last_office or "Student Services"
            augmented = f"Calculate route and time from {origin} to {dest}"
            logger.info(f"Resolved ETA follow-up '{query}' to '{augmented}'")
            return augmented, updated_state

        # 4. Person follow-up: "Who is the professor?", "Who is that?"
        if ("who is" in query_lower or "contact" in query_lower) and any(p in query_lower for p in ["that", "him", "her", "them", "the professor", "the dean"]):
            if state.last_person:
                augmented = f"Contact details for {state.last_person}"
                return augmented, updated_state

        return query, updated_state

    @staticmethod
    def update_state_after_turn(
        state: ConversationState,
        intent: str,
        entities: Dict[str, Any],
        tool_name: Optional[str] = None,
        tool_result: Optional[Dict[str, Any]] = None,
        sources: Optional[list] = None,
    ) -> ConversationState:
        """Update conversation state after an interaction turn."""
        updated = state.model_copy()
        updated.active_intent = intent

        if entities.get("procedure"):
            updated.last_procedure = entities["procedure"]
            updated.active_entity = entities["procedure"]
        if entities.get("location"):
            updated.current_destination = entities["location"]
            updated.last_office = entities["location"]
            updated.active_entity = entities["location"]
        if entities.get("person_name"):
            updated.last_person = entities["person_name"]
            updated.active_entity = entities["person_name"]
        if entities.get("service"):
            updated.last_service = entities["service"]
            updated.active_entity = entities["service"]

        # Tool result updates
        if tool_name:
            updated.last_tool_name = tool_name
            if tool_result and isinstance(tool_result, dict):
                updated.last_tool_result = tool_result
                if tool_name == "get_procedure" and "responsibleOffice" in tool_result:
                    updated.current_destination = tool_result.get("responsibleOffice")
                    updated.last_office = tool_result.get("responsibleOffice")
                elif tool_name == "get_location" and "name" in tool_result:
                    updated.current_destination = tool_result.get("name")
                    updated.last_office = tool_result.get("name")

        if sources:
            updated.last_source_ids = [s.source_id for s in sources if hasattr(s, "source_id")]

        return updated
