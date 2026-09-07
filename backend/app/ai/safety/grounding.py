import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from app.ai.schemas.response import SourceAttribution

logger = logging.getLogger("nexora.ai.safety.grounding")

UNVERIFIED_STANDARD_REFUSAL = (
    "I couldn't verify that information from the available community sources."
)


class GroundingValidator:
    """
    Validates that community factual claims are grounded in retrieved evidence,
    verifies citation identifiers ([S1], [S2]), and prevents hallucinated responses.
    """

    @classmethod
    def extract_citations(cls, text: str) -> List[str]:
        """Extract citation identifiers from response text (e.g. [S1], [S2])."""
        return re.findall(r"\[(S\d+)\]", text)

    @classmethod
    def validate_citations(
        cls,
        answer: str,
        sources: List[SourceAttribution],
    ) -> Tuple[bool, List[str]]:
        """
        Verify that all citation identifiers cited in the answer exist in the retrieved sources.
        Returns (is_valid, list_of_invalid_citations).
        """
        cited_ids = cls.extract_citations(answer)
        if not cited_ids:
            return True, []

        valid_source_ids = {s.id for s in sources if s.id}
        invalid_ids = [c for c in cited_ids if c not in valid_source_ids]

        if invalid_ids:
            logger.warning(f"Answer cited nonexistent or unretrieved sources: {invalid_ids}")
            return False, invalid_ids

        return True, []

    @classmethod
    def is_answer_grounded(
        cls,
        query: str,
        answer: str,
        retrieved_chunks: List[Any],
        tool_results: List[Any],
    ) -> bool:
        """
        Check if answer is properly grounded:
        - Non-empty answer
        - Admits uncertainty if no evidence was retrieved
        - Does not fabricate nonexistent citations
        """
        if not answer or not answer.strip():
            return False

        has_evidence = bool(retrieved_chunks or tool_results)
        lower_ans = answer.lower()

        if not has_evidence:
            return "couldn't verify" in lower_ans or "not available" in lower_ans or "unable to verify" in lower_ans

        # Verify cited sources belong to retrieved evidence
        if isinstance(retrieved_chunks, list) and retrieved_chunks and isinstance(retrieved_chunks[0], SourceAttribution):
            is_valid, _ = cls.validate_citations(answer, retrieved_chunks)
            if not is_valid:
                return False

        return True

    @classmethod
    def enforce_grounding(
        cls,
        query: str,
        answer: str,
        retrieved_chunks: List[Any],
        tool_results: List[Any],
        needs_retrieval: bool = True,
        is_external: bool = False,
    ) -> str:
        """
        Enforce strict refusal if query required community retrieval but found zero evidence,
        or if the generated answer is invalid/empty.
        """
        if not answer or not answer.strip():
            return UNVERIFIED_STANDARD_REFUSAL

        if is_external:
            return answer

        has_evidence = bool(retrieved_chunks or tool_results)

        # 1. Zero evidence check
        if needs_retrieval and not has_evidence:
            lower_ans = answer.lower()
            if not ("couldn't verify" in lower_ans or "not available" in lower_ans or "unable to verify" in lower_ans):
                logger.warning(f"Ungrounded answer blocked for query '{query}'; enforcing refusal fallback.")
                return UNVERIFIED_STANDARD_REFUSAL

        # 2. Citation integrity check
        if isinstance(retrieved_chunks, list) and retrieved_chunks and isinstance(retrieved_chunks[0], SourceAttribution):
            is_valid, invalid_citations = cls.validate_citations(answer, retrieved_chunks)
            if not is_valid:
                # Sanitize invalid citations by stripping them
                sanitized_answer = answer
                for inv in invalid_citations:
                    sanitized_answer = re.sub(rf"\[{inv}\]", "", sanitized_answer)
                return sanitized_answer.strip()

        return answer
