import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.chunk import KnowledgeChunk
from app.ai.retrieval.vector_search import VectorSearchEngine, ScoredChunk
from app.ai.retrieval.keyword_search import KeywordSearchEngine

logger = logging.getLogger(__name__)


class HybridSearchResult:
    """
    Encapsulates a unified hybrid retrieval match with semantic, keyword,
    and fused hybrid scores alongside complete source attribution metadata.
    """

    def __init__(
        self,
        chunk: KnowledgeChunk,
        final_score: float,
        vector_score: float = 0.0,
        keyword_score: float = 0.0,
        is_verified: bool = True,
        retrieval_sources: Optional[List[str]] = None,
    ):
        self.chunk = chunk
        self.final_score = final_score
        self.hybrid_score = final_score
        self.vector_score = vector_score
        self.semantic_score = vector_score
        self.keyword_score = keyword_score
        self.is_verified = is_verified
        self.retrieval_sources = retrieval_sources or []

    def to_dict(self) -> Dict[str, Any]:
        """Convert result to source-attribution dictionary for UI cards and grounding."""
        meta = self.chunk.metadata_dict if hasattr(self.chunk, "metadata_dict") else {}
        doc = getattr(self.chunk, "document", None)
        doc_title = meta.get("document_title") or (doc.title if doc else "Official Record")
        doc_version = meta.get("document_version") or (doc.version if doc else 1)

        return {
            "chunk_id": self.chunk.id,
            "document_id": self.chunk.document_id,
            "community_id": self.chunk.community_id,
            "content": self.chunk.content,
            "page_number": self.chunk.page_number,
            "section": self.chunk.section,
            "chunk_index": self.chunk.chunk_index,
            "document_title": doc_title,
            "document_version": doc_version,
            "verification_status": self.chunk.verification_status,
            "semantic_score": round(self.semantic_score, 4),
            "keyword_score": round(self.keyword_score, 4),
            "hybrid_score": round(self.hybrid_score, 4),
            "final_score": round(self.final_score, 4),
            "retrieval_sources": self.retrieval_sources,
            "metadata": meta,
        }


class HybridRetriever:
    """
    Combines pgvector dense semantic retrieval with PostgreSQL Full-Text Search,
    performing score normalization, weighted score fusion, community isolation,
    verification and version filtering, and deduplication.
    """

    def __init__(
        self,
        vector_weight: float = 0.60,
        keyword_weight: float = 0.40,
        verification_bonus: float = 0.25,
    ):
        self.vector_weight = vector_weight
        self.keyword_weight = keyword_weight
        self.verification_bonus = verification_bonus

    def search(
        self,
        db: Session,
        community_id: str,
        query: str,
        top_k: int = 5,
        semantic_top_n: int = 20,
        keyword_top_n: int = 20,
        min_score: float = 0.0,
    ) -> List[HybridSearchResult]:
        """
        Execute full hybrid retrieval pipeline:
        1. Retrieve top candidates from pgvector semantic search
        2. Retrieve top candidates from PostgreSQL full-text search
        3. Normalize candidate scores
        4. Merge and fuse scores with configurable weights and verification bonus
        5. Filter by minimum relevance threshold and limit to top_k
        """
        clean_query = query.strip() if query else ""
        if not clean_query:
            return []

        # 1. Candidate Retrieval: Vector Search
        vector_results = VectorSearchEngine.search(
            db=db,
            community_id=community_id,
            query=clean_query,
            top_k=semantic_top_n,
            min_score=0.0,
        )

        # 2. Candidate Retrieval: Keyword Full-Text Search
        keyword_results = KeywordSearchEngine.search(
            db=db,
            community_id=community_id,
            query=clean_query,
            top_k=keyword_top_n,
            min_score=0.0,
        )

        # 3. Normalize Keyword Scores
        # Vector scores (cosine similarity) are already naturally in [0.0, 1.0].
        # For keyword scores (ts_rank_cd + code boosts), perform relative normalization.
        max_k_score = max((kr.score for kr in keyword_results), default=0.0)

        # 4. Merge candidates by chunk ID
        merged: Dict[str, Dict[str, Any]] = {}

        for vr in vector_results:
            cid = vr.chunk.id
            merged[cid] = {
                "chunk": vr.chunk,
                "v_score": vr.score,
                "norm_v": vr.score,
                "k_score": 0.0,
                "norm_k": 0.0,
                "sources": ["semantic"],
            }

        for kr in keyword_results:
            cid = kr.chunk.id
            norm_k = (kr.score / max_k_score) if max_k_score > 0.0 else 0.0
            if cid in merged:
                merged[cid]["k_score"] = kr.score
                merged[cid]["norm_k"] = norm_k
                if "keyword" not in merged[cid]["sources"]:
                    merged[cid]["sources"].append("keyword")
            else:
                merged[cid] = {
                    "chunk": kr.chunk,
                    "v_score": 0.0,
                    "norm_v": 0.0,
                    "k_score": kr.score,
                    "norm_k": norm_k,
                    "sources": ["keyword"],
                }

        # 5. Calculate Fused Hybrid Score
        results: List[HybridSearchResult] = []

        for cid, data in merged.items():
            chunk = data["chunk"]
            norm_v = data["norm_v"]
            norm_k = data["norm_k"]

            # Single-channel strength preservation: ensure strong semantic matches aren't penalized when keyword match is 0
            max_single = max(norm_v, norm_k)
            weighted_avg = (norm_v * self.vector_weight) + (norm_k * self.keyword_weight)
            base_fused = max(max_single * 0.85, weighted_avg)

            # Verification bonus
            is_verified = getattr(chunk, "verification_status", "VERIFIED") == "VERIFIED"
            if is_verified:
                fused_score = base_fused + self.verification_bonus
            else:
                fused_score = base_fused

            # Minimum relevance threshold check
            if min_score > 0.0 and fused_score < min_score:
                continue

            results.append(
                HybridSearchResult(
                    chunk=chunk,
                    final_score=fused_score,
                    vector_score=data["v_score"],
                    keyword_score=data["k_score"],
                    is_verified=is_verified,
                    retrieval_sources=data["sources"],
                )
            )

        # 6. Sort descending by final fused hybrid score
        results.sort(key=lambda x: x.final_score, reverse=True)
        return results[:top_k]
