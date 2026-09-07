import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Integer, Text, DateTime, ForeignKey, Index, event
from sqlalchemy.dialects.postgresql import TSVECTOR
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector

from app.database.base import Base


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True)
    community_id = Column(String(36), ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True)
    
    content = Column(Text, nullable=False)
    embedding = Column(Vector(384), nullable=True)  # Native pgvector 384-dimensional dense vector
    embedding_json = Column(Text, nullable=True)   # Backward-compatible serialized JSON fallback
    search_vector = Column(TSVECTOR().with_variant(Text, "sqlite"), nullable=True)  # PostgreSQL FTS tsvector
    
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
        Index("idx_knowledge_chunks_search_vector_gin", "search_vector", postgresql_using="gin"),
    )

    @property
    def vector(self) -> List[float]:
        """Returns embedding vector as a list, falling back to embedding_json if unmigrated."""
        if self.embedding is not None:
            return list(self.embedding)
        if self.embedding_json:
            try:
                return json.loads(self.embedding_json)
            except Exception:
                return []
        return []

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


# Synchronize embedding_json whenever embedding is set for safety and backward compatibility
@event.listens_for(KnowledgeChunk.embedding, 'set')
def _sync_embedding_json(target, value, oldvalue, initiator):
    if value is not None:
        try:
            target.embedding_json = json.dumps(list(value))
        except Exception:
            pass
