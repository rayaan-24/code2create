import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.database.base import Base


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    community_id = Column(String(36), ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    content = Column(Text, nullable=False)
    embedding_json = Column(Text, nullable=True)  # JSON-serialized List[float]
    
    page_number = Column(Integer, nullable=True)
    section = Column(String(255), nullable=True)
    chunk_index = Column(Integer, default=0)
    token_count = Column(Integer, default=0)
    
    verification_status = Column(String(32), default="VERIFIED", index=True)
    metadata_json = Column(Text, nullable=True)  # Additional metadata (document title, author, etc.)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    document = relationship("Document", backref="chunks", foreign_keys=[document_id])
    community = relationship("Community", foreign_keys=[community_id])

    __table_args__ = (
        Index("ix_knowledge_chunks_community_status", "community_id", "verification_status"),
    )

    @property
    def embedding(self) -> List[float]:
        if not self.embedding_json:
            return []
        try:
            return json.loads(self.embedding_json)
        except Exception:
            return []

    @embedding.setter
    def embedding(self, values: List[float]):
        if values is None:
            self.embedding_json = None
        else:
            self.embedding_json = json.dumps(values)

    @property
    def metadata_dict(self) -> Dict[str, Any]:
        if not self.metadata_json:
            return {}
        try:
            return json.loads(self.metadata_json)
        except Exception:
            return {}

    @metadata_dict.setter
    def metadata_dict(self, data: Dict[str, Any]):
        if data is None:
            self.metadata_json = None
        else:
            self.metadata_json = json.dumps(data)
