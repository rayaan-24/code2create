import json
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session

from app.models.conversation import ConversationSession, ConversationMessage
from app.ai.context.state import ConversationState


class ContextManager:
    """Manages conversational session storage, bounded context windows, and message pruning."""

    def __init__(self, max_history_turns: int = 6):
        self.max_history_turns = max_history_turns
        self._cached_states: Dict[str, ConversationState] = {}

    def get_or_create_session(
        self,
        db: Session,
        session_id: Optional[str],
        user_id: str,
        community_id: str,
    ) -> Tuple[ConversationSession, ConversationState]:
        """Fetch existing conversation session or initialize a fresh state."""
        session = None
        if session_id:
            session = (
                db.query(ConversationSession)
                .filter(
                    ConversationSession.id == session_id,
                    ConversationSession.user_id == user_id,
                    ConversationSession.community_id == community_id,
                )
                .first()
            )

        if not session:
            init_kwargs = {
                "user_id": user_id,
                "community_id": community_id,
                "title": "New Community Query",
            }
            if session_id:
                existing = db.query(ConversationSession).filter(ConversationSession.id == session_id).first()
                if not existing:
                    init_kwargs["id"] = session_id
            session = ConversationSession(**init_kwargs)
            db.add(session)
            db.commit()
            db.refresh(session)

        # Deserialize state or initialize
        if session.state_json:
            try:
                state_dict = json.loads(session.state_json)
                state = ConversationState.model_validate(state_dict)
            except Exception:
                state = ConversationState(community_id=community_id)
        else:
            state = ConversationState(community_id=community_id)

        return session, state

    def get_formatted_history(self, session: ConversationSession) -> str:
        """Format bounded recent messages for prompt injection."""
        recent_messages = session.messages[-self.max_history_turns :] if session.messages else []
        if not recent_messages:
            return "No previous conversation history."

        lines = []
        for msg in recent_messages:
            role_label = "User" if msg.role == "user" else "NEXORA"
            lines.append(f"{role_label}: {msg.content}")

        return "\n".join(lines)

    def persist_turn(
        self,
        db: Session,
        session: ConversationSession,
        state: ConversationState,
        user_query: str,
        assistant_response: Any,
    ):
        """Save user query, assistant response, and updated state to database."""
        # 1. User message
        user_msg = ConversationMessage(
            conversation_id=session.id,
            role="user",
            content=user_query,
            intent=getattr(assistant_response, "intent", None),
        )
        db.add(user_msg)

        # 2. Assistant message
        asst_msg = ConversationMessage(
            conversation_id=session.id,
            role="assistant",
            content=assistant_response.answer,
            intent=assistant_response.intent,
            structured_data_json=json.dumps(assistant_response.structured_card)
            if assistant_response.structured_card
            else None,
            sources_json=json.dumps([s.model_dump() for s in assistant_response.sources])
            if assistant_response.sources
            else None,
        )
        db.add(asst_msg)

        # 3. Update session title if first turn
        if len(session.messages) <= 2:
            session.title = user_query[:50] + ("..." if len(user_query) > 50 else "")

        # 4. Save state
        session.state_json = json.dumps(state.model_dump())
        db.commit()
        self._cached_states[session.id] = state

    def get_state(self, conversation_id: str, db: Optional[Session] = None) -> Optional[ConversationState]:
        """Retrieve the latest conversation state by conversation_id."""
        if conversation_id in self._cached_states:
            return self._cached_states[conversation_id]
        if db:
            session = db.query(ConversationSession).filter(ConversationSession.id == conversation_id).first()
            if session and session.state_json:
                try:
                    return ConversationState.model_validate(json.loads(session.state_json))
                except Exception:
                    pass
        return None
