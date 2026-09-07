import logging
import re
from typing import List, Tuple
from sqlalchemy import select, func, or_, case
from sqlalchemy.orm import Session

from app.models.chunk import KnowledgeChunk
from app.models.document import Document
from app.ai.retrieval.vector_search import ScoredChunk

logger = logging.getLogger(__name__)

STOP_WORDS = {
    "the", "is", "at", "which", "on", "and", "a", "an", "in", "to",
    "for", "of", "what", "where", "how", "who", "when", "why", "do",
    "does", "did", "can", "could", "would", "should", "my", "your",
    "i", "you", "it", "this", "that", "there"
}


class KeywordSearchEngine:
    """
    PostgreSQL Full-Text Search (FTS) & keyword retrieval engine.
    Uses native tsvector, websearch_to_tsquery, and ts_rank_cd in PostgreSQL,
    with institutional identifier boosting and strict database-level filtering.
    """

    @classmethod
    def extract_institutional_codes(cls, query: str) -> List[str]:
        """
        Extract exact institutional identifiers such as room numbers, building codes,
        and hyphenated abbreviations (e.g. 'SJT-G12', 'Room 104', 'Block A', 'TT-402').
        """
        codes: List[str] = []
        # Hyphenated codes like SJT-G12, TT-402, MB-201
        hyphen_matches = re.findall(r"\b[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+\b", query)
        codes.extend(hyphen_matches)

        # Prefixed codes like Room 104, Block A, Floor 2, Hall 3
        prefix_matches = re.findall(r"\b(?:Room|Block|Floor|Hall|Lab)\s+[A-Za-z0-9]+\b", query, flags=re.IGNORECASE)
        codes.extend(prefix_matches)

        # Standalone alphanumeric codes (e.g., G12, TT402)
        code_tokens = re.findall(r"\b[A-Za-z]{2,5}\d{1,4}\b", query)
        codes.extend(code_tokens)

        # Remove duplicates while preserving case/order
        seen = set()
        deduped = []
        for c in codes:
            c_norm = c.strip()
            if c_norm and c_norm.lower() not in seen:
                seen.add(c_norm.lower())
                deduped.append(c_norm)
        return deduped

    @classmethod
    def extract_query_tokens(cls, query: str) -> List[str]:
        """Extract meaningful searchable tokens, filtering common stop words."""
        # Preserve hyphens in tokens for codes
        raw_tokens = [t.strip().lower() for t in re.split(r"[\s,\.\?!\(\)\[\]]+", query) if len(t.strip()) > 1]
        return [t for t in raw_tokens if t not in STOP_WORDS]

    @classmethod
    def build_fts_query(
        cls,
        community_id: str,
        query: str,
        top_k: int = 10,
        min_score: float = 0.0,
    ):
        """
        Construct a PostgreSQL Full-Text Search query using websearch_to_tsquery,
        ts_rank_cd, and exact institutional identifier boosting.
        """
        clean_query = query.strip()
        ts_q = func.websearch_to_tsquery("english", clean_query)
        rank_expr = func.ts_rank_cd(KnowledgeChunk.search_vector, ts_q)

        codes = cls.extract_institutional_codes(clean_query)
        code_boost_expr = None
        code_filter_expr = None

        if codes:
            boost_cases = []
            code_conditions = []
            for code in codes:
                pattern = f"%{code}%"
                match_cond = or_(
                    KnowledgeChunk.content.ilike(pattern),
                    KnowledgeChunk.section.ilike(pattern),
                )
                boost_cases.append(case((match_cond, 0.75), else_=0.0))
                code_conditions.append(match_cond)

            code_boost_expr = sum(boost_cases)
            code_filter_expr = or_(*code_conditions)

        total_rank = (rank_expr + (code_boost_expr if code_boost_expr is not None else 0.0)).label("rank")

        match_criteria = [KnowledgeChunk.search_vector.op("@@")(ts_q)]
        if code_filter_expr is not None:
            match_criteria.append(code_filter_expr)

        stmt = (
            select(KnowledgeChunk, total_rank)
            .outerjoin(Document, KnowledgeChunk.document_id == Document.id)
            .where(
                KnowledgeChunk.community_id == community_id,
                KnowledgeChunk.verification_status.notin_(["REJECTED", "EXPIRED"]),
                or_(
                    KnowledgeChunk.document_id.is_(None),
                    Document.is_active.is_(True),
                ),
                or_(*match_criteria),
            )
        )

        if min_score > 0.0:
            stmt = stmt.where(total_rank >= min_score)

        stmt = stmt.order_by(total_rank.desc()).limit(top_k)
        return stmt

    @classmethod
    def search(
        cls,
        db: Session,
        community_id: str,
        query: str,
        top_k: int = 10,
        min_score: float = 0.0,
    ) -> List[ScoredChunk]:
        """
        Execute full-text and exact identifier keyword search.
        In PostgreSQL: executes native full-text search with tsvector + GIN index.
        In SQLite: executes test fallback with token and identifier matching.
        """
        if not query or not query.strip():
            return []

        bind = db.get_bind()
        is_postgres = bind.dialect.name == "postgresql"

        if is_postgres:
            stmt = cls.build_fts_query(
                community_id=community_id,
                query=query,
                top_k=top_k,
                min_score=min_score,
            )
            rows = db.execute(stmt).all()
            results: List[ScoredChunk] = []
            for row in rows:
                chunk = row[0]
                rank_score = float(row[1]) if len(row) > 1 and row[1] is not None else 0.0
                results.append(ScoredChunk(chunk=chunk, score=rank_score))
            return results

        # SQLite in-memory test fallback
        logger.warning("SQLite detected in KeywordSearchEngine: using test fallback. PostgreSQL FTS is required in production.")
        tokens = cls.extract_query_tokens(query)
        codes = cls.extract_institutional_codes(query)

        if not tokens and not codes:
            return []

        chunks = (
            db.query(KnowledgeChunk)
            .outerjoin(Document, KnowledgeChunk.document_id == Document.id)
            .filter(
                KnowledgeChunk.community_id == community_id,
                KnowledgeChunk.verification_status.notin_(["REJECTED", "EXPIRED"]),
                or_(
                    KnowledgeChunk.document_id.is_(None),
                    Document.is_active.is_(True),
                ),
            )
            .all()
        )

        scored: List[ScoredChunk] = []

        for c in chunks:
            text = f"{c.content} {c.section or ''}"
            text_lower = text.lower()
            score = 0.0

            # 1. Exact institutional code match bonus
            for code in codes:
                if code.lower() in text_lower:
                    # Give huge boost for exact institutional code presence
                    score += 5.0

            # 2. Token frequency and length matches
            for token in tokens:
                count = text_lower.count(token)
                if count > 0:
                    is_code = bool(re.match(r"^[a-z0-9\-]{2,8}$", token))
                    weight = 2.5 if is_code else 1.0
                    score += count * weight

            if score > 0.0:
                norm_score = min(1.0, score / (6.0 + len(text_lower.split()) / 50.0))
                if norm_score >= min_score:
                    scored.append(ScoredChunk(chunk=c, score=norm_score))

        scored.sort(key=lambda x: x.score, reverse=True)
        return scored[:top_k]
