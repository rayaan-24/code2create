from typing import List, Tuple, Optional
from sqlalchemy.orm import Session

from app.models.chunk import KnowledgeChunk
from app.ai.retrieval.embeddings import embedding_provider


class ScoredChunk:
    def __init__(self, chunk: KnowledgeChunk, score: float):
        self.chunk = chunk
        self.score = score


class VectorSearchEngine:
    """Vector similarity retrieval over community KnowledgeChunk entries."""

    @staticmethod
    def search(
        db: Session,
        community_id: str,
        query: str,
        top_k: int = 10,
        min_score: float = 0.05,
        prioritize_verified: bool = True,
    ) -> List[ScoredChunk]:
        """
        Search knowledge_chunks in community_id by cosine similarity.
        Enforces tenant isolation and verification status filtering.
        Executes database-level pgvector distance operations on PostgreSQL,
        with SQLite in-memory fallback for test isolation.
        """
        query_vec = embedding_provider.embed_text(query)
        dialect_name = db.bind.dialect.name if (db.bind and hasattr(db.bind, "dialect")) else ""

        if dialect_name == "postgresql":
            # Database-level vector similarity search via pgvector
            max_distance = 1.0 - min_score
            dist_expr = KnowledgeChunk.embedding.cosine_distance(query_vec).label("distance")

            query_filter = db.query(KnowledgeChunk, dist_expr).filter(
                KnowledgeChunk.community_id == community_id,
                KnowledgeChunk.embedding.isnot(None),
            )

            if prioritize_verified:
                query_filter = query_filter.filter(
                    KnowledgeChunk.verification_status.notin_(["REJECTED", "EXPIRED"])
                )

            query_filter = query_filter.filter(
                KnowledgeChunk.embedding.cosine_distance(query_vec) <= max_distance
            ).order_by(dist_expr).limit(top_k)

            results = query_filter.all()
            scored: List[ScoredChunk] = []
            for chunk, dist in results:
                # Cosine similarity = 1 - cosine_distance
                sim_score = max(0.0, 1.0 - float(dist))
                scored.append(ScoredChunk(chunk=chunk, score=sim_score))
            return scored

        # Fallback for SQLite in-memory test environment
        query_filter = db.query(KnowledgeChunk).filter(KnowledgeChunk.community_id == community_id)

        if prioritize_verified:
            # Exclude rejected and expired
            query_filter = query_filter.filter(
                KnowledgeChunk.verification_status.notin_(["REJECTED", "EXPIRED"])
            )

        chunks = query_filter.all()
        scored: List[ScoredChunk] = []

        for c in chunks:
            c_vec = c.vector
            if not c_vec or len(c_vec) != len(query_vec):
                continue

            # Dot product of normalized unit vectors = cosine similarity
            sim = sum(q * v for q, v in zip(query_vec, c_vec))
            if sim >= min_score:
                scored.append(ScoredChunk(chunk=c, score=sim))

        # Sort descending by similarity score
        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[:top_k]
