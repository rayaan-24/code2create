import re
import logging
from typing import Tuple

logger = logging.getLogger("nexora.ai.safety")

# Common prompt injection, jailbreak, and system override signatures
INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions?",
    r"disregard\s+(all\s+)?(previous|prior|system)\s+instructions?",
    r"forget\s+(everything|all)\s+you\s+(were\s+)?told",
    r"you\s+are\s+now\s+(in\s+)?(developer\s+mode|unrestricted|DAN|jailbroken)",
    r"system\s*override",
    r"bypass\s+(security|safety|rules|restrictions)",
    r"reveal\s+(system\s+prompt|instructions|secret|passwords?|keys?)",
    r"repeat\s+your\s+(initial|system)\s+instructions?",
    r"<\|\s*im_start\s*\|>",
    r"\[\s*INST\s*\]",
    r"```\s*system",
]


class PromptInjectionDetector:
    """Detects and neutralizes prompt injection attempts in queries and documents."""

    @staticmethod
    def inspect(text: str) -> Tuple[bool, str]:
        """
        Check if text contains prompt injection signals.
        Returns (is_suspicious, reason).
        """
        text_lower = text.lower()
        for pattern in INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                logger.warning(f"Potential prompt injection detected matching pattern: {pattern}")
                return True, f"Matched injection pattern: {pattern}"

        return False, ""

    @staticmethod
    def sanitize_user_input(text: str) -> str:
        """
        Sanitize input: strip model control delimiters and normalize whitespace.
        Ensures input cannot inject fake system/assistant turns into prompt.
        """
        sanitized = re.sub(r"<\|[a-zA-Z0-9_-]+\|>", "", text)
        sanitized = re.sub(r"\[/?INST\]", "", sanitized)
        sanitized = re.sub(r"\[/?SYSTEM\]", "", sanitized)
        return sanitized.strip()

    @staticmethod
    def wrap_untrusted_data(label: str, content: str) -> str:
        """Wrap untrusted document chunks or web data in explicit boundary tags."""
        safe_content = PromptInjectionDetector.sanitize_user_input(content)
        return f"<{label}>\n{safe_content}\n</{label}>"
