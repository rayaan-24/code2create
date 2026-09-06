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
        """
        query_vec = embedding_provider.embed_text(query)

        # Retrieve chunks for community
        query_filter = db.query(KnowledgeChunk).filter(KnowledgeChunk.community_id == community_id)

        if prioritize_verified:
            # Exclude rejected and expired
            query_filter = query_filter.filter(
                KnowledgeChunk.verification_status.notin_(["REJECTED", "EXPIRED"])
            )

        chunks = query_filter.all()
        scored: List[ScoredChunk] = []

        for c in chunks:
            c_vec = c.embedding
            if not c_vec or len(c_vec) != len(query_vec):
                continue

            # Dot product of normalized unit vectors = cosine similarity
            sim = sum(q * v for q, v in zip(query_vec, c_vec))
            if sim >= min_score:
                scored.append(ScoredChunk(chunk=c, score=sim))

        # Sort descending by similarity score
        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[:top_k]
