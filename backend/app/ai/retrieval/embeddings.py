import logging
import os
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger("nexora.ai.embeddings")

# Disable HuggingFace symlinks warning on Windows
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")


class EmbeddingProvider:
    """
    Production-grade Neural Embedding Provider using SentenceTransformers.
    Generates deterministic, semantic 384-dimensional dense vectors
    (using sentence-transformers/all-MiniLM-L6-v2) with L2 normalization
    for PostgreSQL + pgvector cosine similarity retrieval.
    """

    def __init__(self, model_name: Optional[str] = None, dimension: int = 384):
        self.model_name = model_name or settings.EMBEDDING_MODEL
        self.dimension = dimension
        self._model = None
        self._device = "cpu"

    def _load_model(self):
        """
        Lazily loads and caches the SentenceTransformer model once on CPU.
        Thread-safe in Python GIL and reusable across FastAPI requests.
        """
        if self._model is None:
            logger.info("Initializing neural embedding model: %s on %s", self.model_name, self._device)
            try:
                from sentence_transformers import SentenceTransformer

                model = SentenceTransformer(self.model_name, device=self._device)
                dim_getter = getattr(model, "get_embedding_dimension", getattr(model, "get_sentence_embedding_dimension", None))
                dim = dim_getter() if dim_getter else 384

                if dim != self.dimension:
                    raise RuntimeError(
                        f"Embedding model '{self.model_name}' produces {dim}-dimensional vectors, "
                        f"which does not match the configured PostgreSQL pgvector dimension ({self.dimension}). "
                        f"A database schema migration would be required before switching models."
                    )

                self._model = model
                logger.info("Neural embedding model '%s' loaded successfully (dim=%d).", self.model_name, dim)
            except Exception as e:
                logger.error("Critical failure loading neural embedding model '%s': %s", self.model_name, e)
                raise RuntimeError(
                    f"CRITICAL: Failed to load real embedding model '{self.model_name}': {e}. "
                    "MD5/random fallback vectors are strictly disabled in production."
                ) from e

        return self._model

    def embed_text(self, text: str) -> List[float]:
        """
        Generate a 384-dimensional L2-normalized dense embedding vector for a single text or query.
        """
        if not text or not text.strip():
            return [0.0] * self.dimension

        model = self._load_model()
        vec = model.encode(
            text.strip(),
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        return [float(x) for x in vec]

    def embed_documents(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """
        Generate 384-dimensional L2-normalized dense embedding vectors for a batch of documents or chunks.
        """
        if not texts:
            return []

        model = self._load_model()
        cleaned_texts = [t.strip() if t else "" for t in texts]

        vectors = model.encode(
            cleaned_texts,
            batch_size=batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
            show_progress_bar=False,
        )
        return [[float(x) for x in row] for row in vectors]

    def embed_texts(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Alias for embed_documents for batch embedding."""
        return self.embed_documents(texts, batch_size=batch_size)


# Global singleton embedding instance
embedding_provider = EmbeddingProvider()
