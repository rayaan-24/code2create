import json
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.database.base import Base


class ConversationSession(Base):
    __tablename__ = "conversation_sessions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    community_id = Column(String(36), ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    title = Column(String(255), default="New Conversation", nullable=False)
    state_json = Column(Text, nullable=True)  # Serialized ConversationState
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", backref="conversations", foreign_keys=[user_id])
    community = relationship("Community", foreign_keys=[community_id])
    messages = relationship("ConversationMessage", backref="session", cascade="all, delete-orphan", order_by="ConversationMessage.created_at")

    @property
    def state(self) -> Dict[str, Any]:
        if not self.state_json:
            return {}
        try:
            return json.loads(self.state_json)
        except Exception:
            return {}

    @state.setter
    def state(self, value: Dict[str, Any]):
        if value is None:
            self.state_json = None
        else:
            self.state_json = json.dumps(value)


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    conversation_id = Column(String(36), ForeignKey("conversation_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    
    role = Column(String(32), nullable=False)  # 'user', 'assistant', 'system', 'tool'
    content = Column(Text, nullable=False)
    intent = Column(String(64), nullable=True)
    
    structured_data_json = Column(Text, nullable=True)  # JSON for Procedure/Location/Person/Service card
    sources_json = Column(Text, nullable=True)          # List of attributed verified sources
    tool_calls_json = Column(Text, nullable=True)       # Executed tools & parameters
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    @property
    def structured_data(self) -> Optional[Dict[str, Any]]:
        if not self.structured_data_json:
            return None
        try:
            return json.loads(self.structured_data_json)
        except Exception:
            return None

    @structured_data.setter
    def structured_data(self, val: Optional[Dict[str, Any]]):
        self.structured_data_json = json.dumps(val) if val is not None else None

    @property
    def sources(self) -> List[Dict[str, Any]]:
        if not self.sources_json:
            return []
        try:
            return json.loads(self.sources_json)
        except Exception:
            return []

    @sources.setter
    def sources(self, val: List[Dict[str, Any]]):
        self.sources_json = json.dumps(val) if val is not None else None
