import re
from typing import List
from sqlalchemy.orm import Session

from app.models.chunk import KnowledgeChunk
from app.ai.retrieval.vector_search import ScoredChunk


class KeywordSearchEngine:
    """PostgreSQL full-text & keyword retrieval for exact codes, room numbers, and names."""

    @staticmethod
    def search(
        db: Session,
        community_id: str,
        query: str,
        top_k: int = 10,
    ) -> List[ScoredChunk]:
        """
        Search knowledge_chunks by keyword matching against content and section.
        Prioritizes exact matches for room codes and names.
        """
        raw_tokens = [t.strip().lower() for t in re.split(r"[\s,\-\.\?]+", query) if len(t.strip()) > 1]
        # Filter out common stop words
        stop_words = {"the", "is", "at", "which", "on", "and", "a", "an", "in", "to", "for", "of", "what", "where", "how"}
        tokens = [t for t in raw_tokens if t not in stop_words]

        if not tokens:
            return []

        chunks = (
            db.query(KnowledgeChunk)
            .filter(
                KnowledgeChunk.community_id == community_id,
                KnowledgeChunk.verification_status.notin_(["REJECTED", "EXPIRED"]),
            )
            .all()
        )

        scored: List[ScoredChunk] = []

        for c in chunks:
            text_lower = (c.content + " " + (c.section or "")).lower()
            score = 0.0

            for token in tokens:
                # Count occurrences
                count = text_lower.count(token)
                if count > 0:
                    # Acronym or uppercase match bonus
                    is_code = bool(re.match(r"^[a-z0-9]{2,5}$", token))
                    weight = 2.5 if is_code else 1.0
                    score += count * weight

            if score > 0.0:
                # Normalize by chunk length
                norm_score = min(1.0, score / (10.0 + len(text_lower.split()) / 50.0))
                scored.append(ScoredChunk(chunk=c, score=norm_score))

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[:top_k]
