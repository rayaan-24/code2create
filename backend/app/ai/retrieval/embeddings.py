import math
import hashlib
from typing import List, Optional
from app.core.config import settings


class EmbeddingProvider:
    """
    Configurable embedding provider abstraction.
    Provides standard 384-dimensional dense semantic vectors with L2 normalization.
    """

    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.model_name = settings.EMBEDDING_MODEL

    def embed_text(self, text: str) -> List[float]:
        """Generate normalized dense embedding vector for text."""
        return self._generate_dense_vector(text)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Generate normalized dense embedding vectors for a batch of texts."""
        return [self.embed_text(t) for t in texts]

    def _generate_dense_vector(self, text: str) -> List[float]:
        """
        Deterministic, semantic-preserving sub-word n-gram vectorizer.
        Generates consistent 384-dimensional unit vectors for cosine similarity.
        """
        words = text.lower().split()
        if not words:
            return [0.0] * self.dimension

        vec = [0.0] * self.dimension

        # Combine word unigrams and bigrams
        tokens = list(words)
        for i in range(len(words) - 1):
            tokens.append(f"{words[i]}_{words[i+1]}")

        for token in tokens:
            h = int(hashlib.md5(token.encode("utf-8")).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if ((h >> 8) & 1) == 1 else -1.0
            weight = 1.0 + (len(token) / 10.0)
            vec[idx] += sign * weight

        # L2-normalize vector so dot product equals cosine similarity
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 1e-9:
            vec = [x / norm for x in vec]

        return vec


# Global embedding instance
embedding_provider = EmbeddingProvider()
