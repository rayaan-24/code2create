import logging
from typing import List, Optional, Dict, Any
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.chunk import KnowledgeChunk
from app.models.document import Document
from app.models.procedure import VerificationStatus
from app.ai.retrieval.embeddings import embedding_provider

logger = logging.getLogger("nexora.ai.vector_search")


class ScoredChunk:
    """
    Ranked knowledge chunk result containing semantic similarity score,
    cosine distance, and complete metadata for source attribution.
    """

    def __init__(self, chunk: KnowledgeChunk, score: float, distance: float = 0.0):
        self.chunk = chunk
        self.score = float(score)  # Cosine similarity in range [0.0, 1.0]
        self.distance = float(distance)  # Cosine distance in range [0.0, 2.0]

    @property
    def chunk_id(self) -> str:
        return self.chunk.id

    @property
    def document_id(self) -> Optional[str]:
        return self.chunk.document_id

    @property
    def community_id(self) -> str:
        return self.chunk.community_id

    @property
    def content(self) -> str:
        return self.chunk.content

    @property
    def page_number(self) -> Optional[int]:
        return self.chunk.page_number

    @property
    def section(self) -> Optional[str]:
        return self.chunk.section

    @property
    def chunk_index(self) -> int:
        return self.chunk.chunk_index

    @property
    def document_title(self) -> str:
        if self.chunk.document and hasattr(self.chunk.document, "title") and self.chunk.document.title:
            return self.chunk.document.title
        return self.chunk.metadata_dict.get("document_title", "Document")

    @property
    def document_version(self) -> int:
        if self.chunk.document and hasattr(self.chunk.document, "version") and self.chunk.document.version:
            return self.chunk.document.version
        return self.chunk.metadata_dict.get("document_version", 1)

    @property
    def verification_status(self) -> str:
        return self.chunk.verification_status or "VERIFIED"

    @property
    def metadata(self) -> Dict[str, Any]:
        return self.chunk.metadata_dict

    def to_dict(self) -> Dict[str, Any]:
        """Structured dictionary for grounding and source citation."""
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "community_id": self.community_id,
            "content": self.content,
            "page_number": self.page_number,
            "section": self.section,
            "chunk_index": self.chunk_index,
            "document_title": self.document_title,
            "document_version": self.document_version,
            "verification_status": self.verification_status,
            "similarity_score": round(self.score, 4),
            "distance_score": round(self.distance, 4),
            "metadata": self.metadata,
        }

    def __repr__(self) -> str:
        return f"<ScoredChunk id={self.chunk_id} score={self.score:.4f} section='{self.section}'>"


class VectorSearchEngine:
    """
    Production-grade Vector Similarity Retrieval engine.
    Executes database-level pgvector cosine similarity search directly within PostgreSQL
    using the HNSW index on KnowledgeChunk.embedding Vector(384).
    Enforces strict tenant isolation, document active status, and verification filtering.
    """

    @classmethod
    def build_pgvector_query(
        cls,
        db: Session,
        community_id: str,
        query_vec: List[float],
        top_k: int = 5,
        min_score: float = 0.0,
        prioritize_verified: bool = True,
        only_verified: bool = False,
    ):
        """
        Builds the database-level SQLAlchemy query using pgvector's cosine_distance (<=>).
        Utilizes the HNSW index on KnowledgeChunk.embedding for high-speed sub-millisecond retrieval.
        """
        dist_expr = KnowledgeChunk.embedding.cosine_distance(query_vec).label("distance")

        # Base query with tenant isolation and outer join on Document
        query = (
            db.query(KnowledgeChunk, dist_expr)
            .outerjoin(Document, KnowledgeChunk.document_id == Document.id)
            .filter(
                KnowledgeChunk.community_id == community_id,
                KnowledgeChunk.embedding.isnot(None),
            )
        )

        # 1. Exclude chunks from deactivated/archived documents
        query = query.filter(
            or_(KnowledgeChunk.document_id.is_(None), Document.is_active.is_(True))
        )

        # 2. Verification status filtering
        if only_verified:
            query = query.filter(
                KnowledgeChunk.verification_status == "VERIFIED",
                or_(
                    KnowledgeChunk.document_id.is_(None),
                    Document.verification_status == VerificationStatus.VERIFIED,
                ),
            )
        elif prioritize_verified:
            query = query.filter(
                KnowledgeChunk.verification_status.notin_(["REJECTED", "EXPIRED"]),
                or_(
                    KnowledgeChunk.document_id.is_(None),
                    Document.verification_status.notin_([
                        VerificationStatus.REJECTED,
                        VerificationStatus.EXPIRED,
                    ]),
                ),
            )

        # 3. Minimum relevance threshold filtering at the database level
        if min_score > 0.0:
            max_distance = 1.0 - min_score
            query = query.filter(KnowledgeChunk.embedding.cosine_distance(query_vec) <= max_distance)

        # 4. Order by cosine distance ascending (closest first) using HNSW index
        query = query.order_by(dist_expr.asc()).limit(top_k)
        return query

    @classmethod
    def search(
        cls,
        db: Session,
        community_id: str,
        query: str,
        top_k: Optional[int] = None,
        min_score: float = 0.05,
        prioritize_verified: bool = True,
        only_verified: bool = False,
    ) -> List[ScoredChunk]:
        """
        Search knowledge_chunks in community_id by cosine similarity.
        Enforces tenant isolation, document active status, and verification filtering.
        Executes database-level pgvector distance operations on PostgreSQL,
        with SQLite in-memory fallback for test isolation.
        """
        if not query or not query.strip():
            return []

        effective_top_k = top_k if (top_k is not None and top_k > 0) else settings.VECTOR_SEARCH_TOP_K

        # Generate 384-dimensional query embedding via real EmbeddingProvider (all-MiniLM-L6-v2)
        query_vec = embedding_provider.embed_text(query)

        dialect_name = db.bind.dialect.name if (db.bind and hasattr(db.bind, "dialect")) else ""

        # Production Path: PostgreSQL + pgvector native database-level search
        if dialect_name == "postgresql":
            pg_query = cls.build_pgvector_query(
                db=db,
                community_id=community_id,
                query_vec=query_vec,
                top_k=effective_top_k,
                min_score=min_score,
                prioritize_verified=prioritize_verified,
                only_verified=only_verified,
            )
            results = pg_query.all()

            scored: List[ScoredChunk] = []
            for chunk, dist in results:
                dist_val = float(dist) if dist is not None else 1.0
                sim_score = max(0.0, min(1.0, 1.0 - dist_val))
                scored.append(ScoredChunk(chunk=chunk, score=sim_score, distance=dist_val))
            return scored

        # Test Isolation Path: SQLite in-memory fallback
        query_filter = (
            db.query(KnowledgeChunk)
            .outerjoin(Document, KnowledgeChunk.document_id == Document.id)
            .filter(KnowledgeChunk.community_id == community_id)
        )

        query_filter = query_filter.filter(
            or_(KnowledgeChunk.document_id.is_(None), Document.is_active.is_(True))
        )

        if only_verified:
            query_filter = query_filter.filter(
                KnowledgeChunk.verification_status == "VERIFIED",
                or_(
                    KnowledgeChunk.document_id.is_(None),
                    Document.verification_status == VerificationStatus.VERIFIED,
                ),
            )
        elif prioritize_verified:
            query_filter = query_filter.filter(
                KnowledgeChunk.verification_status.notin_(["REJECTED", "EXPIRED"]),
                or_(
                    KnowledgeChunk.document_id.is_(None),
                    Document.verification_status.notin_([
                        VerificationStatus.REJECTED,
                        VerificationStatus.EXPIRED,
                    ]),
                ),
            )

        chunks = query_filter.all()
        scored_fallback: List[ScoredChunk] = []

        for c in chunks:
            c_vec = c.vector
            if not c_vec or len(c_vec) != len(query_vec):
                continue

            # Dot product of normalized unit vectors = cosine similarity
            sim = sum(q * v for q, v in zip(query_vec, c_vec))
            sim_clamped = max(0.0, min(1.0, sim))
            dist = max(0.0, 1.0 - sim_clamped)
            if sim_clamped >= min_score:
                scored_fallback.append(ScoredChunk(chunk=c, score=sim_clamped, distance=dist))

        # Sort descending by similarity score
        scored_fallback.sort(key=lambda x: x.score, reverse=True)
        return scored_fallback[:effective_top_k]
