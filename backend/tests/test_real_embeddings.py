import math
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.models.community import Community
from app.models.user import User, UserRole
from app.models.document import Document
from app.models.chunk import KnowledgeChunk
from app.ai.retrieval.embeddings import EmbeddingProvider, embedding_provider
from app.services.storage_service import DocumentStorageService
from app.services.ingestion_service import DocumentIngestionService
from scripts.reembed_chunks import reembed_knowledge_chunks


def cosine_similarity(vec1, vec2) -> float:
    """Calculate cosine similarity between two vectors."""
    dot = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = math.sqrt(sum(a * a for a in vec1))
    norm2 = math.sqrt(sum(b * b for b in vec2))
    if norm1 < 1e-9 or norm2 < 1e-9:
        return 0.0
    return dot / (norm1 * norm2)


def test_embedding_model_loading_and_dimension():
    """Verify that the real model loads and returns exactly 384 dimensions with float values."""
    assert embedding_provider.dimension == 384
    vec = embedding_provider.embed_text("Campus central library opening hours")
    assert len(vec) == 384
    assert all(isinstance(x, float) for x in vec)
    # L2-normalized vector has Euclidean norm approximately 1.0
    norm = math.sqrt(sum(x * x for x in vec))
    assert abs(norm - 1.0) < 1e-4


def test_embedding_batch_processing():
    """Verify that embed_documents / embed_texts handles batches correctly."""
    texts = [
        "First campus security guideline",
        "Second parking regulation",
        "Third dining hall schedule",
    ]
    vecs = embedding_provider.embed_documents(texts)
    assert len(vecs) == 3
    for v in vecs:
        assert len(v) == 384
        assert all(isinstance(x, float) for x in v)

    # Verify alias embed_texts
    vecs_alias = embedding_provider.embed_texts(texts)
    assert len(vecs_alias) == 3
    assert vecs == vecs_alias


def test_embedding_determinism_and_variance():
    """Verify identical texts produce identical vectors and distinct texts produce distinct vectors."""
    text = "Student health and wellness center appointment"
    vec1 = embedding_provider.embed_text(text)
    vec2 = embedding_provider.embed_text(text)
    assert vec1 == vec2

    diff_text = "Parking permits for faculty vehicles in Zone B"
    vec_diff = embedding_provider.embed_text(diff_text)
    assert vec1 != vec_diff


def test_semantic_sanity_similarity():
    """
    Semantic Sanity Test:
    Text A: "Students who lose their university identification card must visit Student Services."
    Text B: "ID card replacement is handled by Student Services."
    Text C: "The university library closes at 8 PM."

    Assert: Cosine similarity(A, B) > Cosine similarity(A, C).
    """
    text_a = "Students who lose their university identification card must visit Student Services."
    text_b = "ID card replacement is handled by Student Services."
    text_c = "The university library closes at 8 PM."

    emb_a = embedding_provider.embed_text(text_a)
    emb_b = embedding_provider.embed_text(text_b)
    emb_c = embedding_provider.embed_text(text_c)

    sim_ab = cosine_similarity(emb_a, emb_b)
    sim_ac = cosine_similarity(emb_a, emb_c)

    # Real neural embeddings MUST place ID replacement much closer to lost ID than library hours
    assert sim_ab > sim_ac
    assert sim_ab > 0.60
    assert sim_ac < 0.35


def test_no_fake_fallback_on_invalid_model():
    """Verify that an invalid model fails clearly with RuntimeError rather than generating fake vectors."""
    invalid_provider = EmbeddingProvider(model_name="nonexistent/fake-model-12345678")
    with pytest.raises(RuntimeError, match="CRITICAL: Failed to load real embedding model"):
        invalid_provider.embed_text("Testing error behavior")


def test_real_nexora_document_ingestion_with_embeddings(tmp_path):
    """
    Test real NEXORA ingestion using the required validation document:
    ID CARD REPLACEMENT
    Students who have lost their ID card must visit Student Services located at SJT Ground Floor.
    Replacement fee: ₹100.
    Office Hours:
    9:00 AM - 4:30 PM.
    """
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    try:
        community = Community(id="comm-real-emb", name="Tech Institute")
        db.add(community)
        user = User(
            id="user-admin-real",
            community_id=community.id,
            email="admin@tech.edu",
            name="Admin",
            password_hash="pw",
            role=UserRole.ADMIN,
        )
        db.add(user)
        db.commit()

        storage = DocumentStorageService(base_dir=str(tmp_path))
        ingestion_service = DocumentIngestionService(storage=storage)

        doc_content = """# ID CARD REPLACEMENT

Students who have lost their ID card must visit Student Services located at SJT Ground Floor.

Replacement fee: ₹100.

Office Hours:
9:00 AM - 4:30 PM.
"""
        doc_bytes = doc_content.encode("utf-8")

        response = ingestion_service.ingest_document(
            db=db,
            community_id=community.id,
            file_name="id_card_replacement.md",
            file_bytes=doc_bytes,
            user_id=user.id,
            title="ID Card Replacement",
        )

        assert response.document_id is not None
        assert response.chunks_created >= 1

        chunks = db.query(KnowledgeChunk).filter(KnowledgeChunk.document_id == response.document_id).all()
        assert len(chunks) >= 1

        for ch in chunks:
            assert ch.content is not None
            assert ch.embedding is not None
            assert len(ch.embedding) == 384
            assert all(isinstance(x, float) for x in ch.embedding)

            # Verify that query embedding for "Where do I replace my student ID?" is semantically close to this chunk
            query_emb = embedding_provider.embed_text("Where do I replace my student ID?")
            chunk_sim = cosine_similarity(query_emb, ch.embedding)
            # High semantic similarity on real neural embedding
            assert chunk_sim > 0.50

    finally:
        db.close()


def test_reembedding_utility():
    """Verify that reembed_knowledge_chunks updates existing chunks in batches and supports dry-run."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()

    try:
        community = Community(id="comm-reembed", name="Reembed Campus")
        db.add(community)

        # Create chunks with dummy/zero vectors
        c1 = KnowledgeChunk(
            id="chunk-1",
            community_id=community.id,
            content="Campus health center emergency contact is extension 999.",
            embedding=[0.0] * 384,
            token_count=10,
        )
        c2 = KnowledgeChunk(
            id="chunk-2",
            community_id=community.id,
            content="Gymnasium and sports complex requires student pass.",
            embedding=[0.0] * 384,
            token_count=9,
        )
        db.add_all([c1, c2])
        db.commit()

        # 1. Test dry-run mode (no changes committed)
        count_dry = reembed_knowledge_chunks(db, batch_size=1, dry_run=True)
        assert count_dry == 2
        db.refresh(c1)
        assert c1.embedding[0] == 0.0

        # 2. Test live execution
        count_live = reembed_knowledge_chunks(db, batch_size=1, dry_run=False)
        assert count_live == 2
        db.refresh(c1)
        db.refresh(c2)

        assert len(c1.embedding) == 384
        assert not all(x == 0.0 for x in c1.embedding)
        assert len(c2.embedding) == 384
        assert not all(x == 0.0 for x in c2.embedding)
        assert c1.content == "Campus health center emergency contact is extension 999."

    finally:
        db.close()
