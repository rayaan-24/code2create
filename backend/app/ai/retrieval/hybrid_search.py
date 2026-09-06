from typing import List, Dict
from sqlalchemy.orm import Session

from app.models.chunk import KnowledgeChunk
from app.ai.retrieval.vector_search import VectorSearchEngine, ScoredChunk
from app.ai.retrieval.keyword_search import KeywordSearchEngine


class HybridSearchResult:
    def __init__(
        self,
        chunk: KnowledgeChunk,
        final_score: float,
        vector_score: float = 0.0,
        keyword_score: float = 0.0,
        is_verified: bool = True,
    ):
        self.chunk = chunk
        self.final_score = final_score
        self.vector_score = vector_score
        self.keyword_score = keyword_score
        self.is_verified = is_verified


class HybridRetriever:
    """
    Combines dense vector retrieval with exact keyword search,
    applying verification status and freshness bonuses.
    """

    def __init__(
        self,
        vector_weight: float = 0.6,
        keyword_weight: float = 0.4,
        verification_bonus: float = 0.2,
    ):
        self.vector_weight = vector_weight
        self.keyword_weight = keyword_weight
        self.verification_bonus = verification_bonus

    def search(
        self,
        db: Session,
        community_id: str,
        query: str,
        top_k: int = 8,
    ) -> List[HybridSearchResult]:
        """Execute hybrid search combining vector and keyword results."""
        # 1. Vector Search
        vector_results = VectorSearchEngine.search(
            db=db,
            community_id=community_id,
            query=query,
            top_k=top_k * 2,
        )

        # 2. Keyword Search
        keyword_results = KeywordSearchEngine.search(
            db=db,
            community_id=community_id,
            query=query,
            top_k=top_k * 2,
        )

        # 3. Combine scores
        merged: Dict[str, Dict[str, Any]] = {}

        for vr in vector_results:
            cid = vr.chunk.id
            merged[cid] = {
                "chunk": vr.chunk,
                "v_score": vr.score,
                "k_score": 0.0,
            }

        for kr in keyword_results:
            cid = kr.chunk.id
            if cid in merged:
                merged[cid]["k_score"] = kr.score
            else:
                merged[cid] = {
                    "chunk": kr.chunk,
                    "v_score": 0.0,
                    "k_score": kr.score,
                }

        results: List[HybridSearchResult] = []

        for cid, data in merged.items():
            chunk = data["chunk"]
            v_score = data["v_score"]
            k_score = data["k_score"]

            base_score = (v_score * self.vector_weight) + (k_score * self.keyword_weight)

            # Verification bonus
            is_verified = chunk.verification_status == "VERIFIED"
            if is_verified:
                base_score += self.verification_bonus

            results.append(
                HybridSearchResult(
                    chunk=chunk,
                    final_score=base_score,
                    vector_score=v_score,
                    keyword_score=k_score,
                    is_verified=is_verified,
                )
            )

        # Sort descending by final combined score
        results.sort(key=lambda x: x.final_score, reverse=True)
        return results[:top_k]
