from typing import List, Dict, Any, Optional

UNVERIFIED_STANDARD_REFUSAL = (
    "I couldn't verify that information from the available community sources. "
    "Would you like me to help you find the responsible department?"
)


class GroundingValidator:
    """Validates that community factual claims are grounded in retrieved evidence."""

    @staticmethod
    def is_answer_grounded(
        query: str,
        answer: str,
        retrieved_chunks: List[Any],
        tool_results: List[Any],
    ) -> bool:
        """
        Check if answer claims can be traced to retrieved knowledge or tools.
        If no evidence was retrieved and user asked a factual question, flag ungrounded.
        """
        if not retrieved_chunks and not tool_results:
            # If answer admits uncertainty, that is grounded
            if "couldn't verify" in answer.lower() or "not available" in answer.lower():
                return True
            return False
        return True

    @staticmethod
    def enforce_grounding(
        query: str,
        answer: str,
        retrieved_chunks: List[Any],
        tool_results: List[Any],
        needs_retrieval: bool = True,
    ) -> str:
        """Enforce strict refusal if query required community retrieval but found zero evidence."""
        if needs_retrieval and not retrieved_chunks and not tool_results:
            # Check if answer attempted to fabricate facts
            lower_ans = answer.lower()
            if not ("couldn't verify" in lower_ans or "not found" in lower_ans or "unavailable" in lower_ans):
                return UNVERIFIED_STANDARD_REFUSAL

        return answer
