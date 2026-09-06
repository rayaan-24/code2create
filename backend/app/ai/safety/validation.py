import time
from typing import Dict, Tuple
from collections import defaultdict

from app.core.config import settings


class RateLimiter:
    """Sliding-window in-memory rate limiter for expensive AI endpoints."""

    def __init__(self, limit_per_minute: int = 60):
        self.limit = limit_per_minute
        self.history: Dict[str, list] = defaultdict(list)

    def is_allowed(self, identifier: str) -> Tuple[bool, int]:
        """Check if request is allowed. Returns (allowed, remaining_quota)."""
        now = time.time()
        window_start = now - 60.0

        # Purge expired timestamps
        self.history[identifier] = [t for t in self.history[identifier] if t > window_start]

        if len(self.history[identifier]) >= self.limit:
            return False, 0

        self.history[identifier].append(now)
        return True, self.limit - len(self.history[identifier])


rate_limiter = RateLimiter(limit_per_minute=settings.RATE_LIMIT_PER_MINUTE)


def validate_input_length(text: str, max_chars: int = 4000) -> str:
    """Ensure user query doesn't exceed reasonable context limits."""
    if len(text) > max_chars:
        return text[:max_chars]
    return text
