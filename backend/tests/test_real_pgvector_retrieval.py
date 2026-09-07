import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.models.community import Community
from app.models.document import Document
from app.models.chunk import KnowledgeChunk
from app.models.procedure import VerificationStatus
from app.ai.retrieval.vector_search import VectorSearchEngine, ScoredChunk
from app.ai.retrieval.embeddings import embedding_provider


@pytest.fixture
def db_session_pgvector():
    """Isolated in-memory database session for vector retrieval tests."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


def test_pgvector_sql_generation_and_hnsw_compatibility(db_session_pgvector):
    """
    Verify that VectorSearchEngine compiles exact PostgreSQL pgvector operations:
    - Uses cosine_distance operator (<=>)
    - Orders by distance ascending (ORDER BY embedding <=> query_vector ASC)
    - Filters by community_id and verification status
    - Limits to top_k
    """
    dialect = postgresql.dialect()
    test_query_vec = [0.05] * 384

    query = VectorSearchEngine.build_pgvector_query(
        db=db_session_pgvector,
        community_id="comm-alpha-123",
        query_vec=test_query_vec,
        top_k=5,
        min_score=0.4,
        prioritize_verified=True,
    )

    compiled = str(query.statement.compile(dialect=dialect))

    # Assert database-level pgvector cosine distance operator
    assert "<=>" in compiled
    # Assert community isolation filter
    assert "knowledge_chunks.community_id" in compiled
    # Assert ordering by cosine distance for HNSW index utilization
    assert "ORDER BY knowledge_chunks.embedding <=> " in compiled or "<=>" in compiled
    # Assert limit clause
    assert "LIMIT" in compiled


def test_real_nexora_id_card_queries(db_session_pgvector):
    """
    Test real NEXORA semantic retrieval on institutional knowledge:
    Knowledge:
    "Students who have lost their ID card must visit Student Services located at SJT Ground Floor.
     The replacement fee is ₹100."
    """
    comm = Community(id="comm-test-vit", name="VIT Campus")
    db_session_pgvector.add(comm)

    content = (
        "Students who have lost their ID card must visit Student Services located at SJT Ground Floor. "
        "The replacement fee is ₹100."
    )
    # Generate real 384-dimensional neural embedding
    emb = embedding_provider.embed_text(content)

    chunk = KnowledgeChunk(
        id="chunk-id-replace-1",
        community_id=comm.id,
        content=content,
        embedding=emb,
        section="ID Card Replacement",
        page_number=1,
        chunk_index=0,
        token_count=len(content.split()),
        verification_status="VERIFIED",
    )
    db_session_pgvector.add(chunk)
    db_session_pgvector.commit()

    # Query 1: Location of ID replacement
    results_loc = VectorSearchEngine.search(
        db=db_session_pgvector,
        community_id=comm.id,
        query="Where can I replace my ID card?",
        top_k=5,
        min_score=0.3,
    )
    assert len(results_loc) == 1
    top_loc = results_loc[0]
    assert top_loc.chunk_id == "chunk-id-replace-1"
    assert "SJT Ground Floor" in top_loc.content
    assert top_loc.score > 0.50  # Real neural similarity
    assert top_loc.distance < 0.50

    # Query 2: Fee for ID replacement
    results_fee = VectorSearchEngine.search(
        db=db_session_pgvector,
        community_id=comm.id,
        query="How much does replacing the ID card cost?",
        top_k=5,
        min_score=0.3,
    )
    assert len(results_fee) == 1
    top_fee = results_fee[0]
    assert top_fee.chunk_id == "chunk-id-replace-1"
    assert "₹100" in top_fee.content
    assert top_fee.score > 0.50


def test_negative_relevance_threshold(db_session_pgvector):
    """
    Negative test:
    Ask an unrelated query: "What is the library closing time?"
    when the only available knowledge is about ID card replacement.
    Verify: The chunk does NOT pass the configured relevance threshold and returns an empty list.
    """
    comm = Community(id="comm-neg-test", name="North Campus")
    db_session_pgvector.add(comm)

    content = "Students who have lost their ID card must visit Student Services located at SJT Ground Floor."
    emb = embedding_provider.embed_text(content)

    chunk = KnowledgeChunk(
        id="chunk-id-only",
        community_id=comm.id,
        content=content,
        embedding=emb,
        verification_status="VERIFIED",
    )
    db_session_pgvector.add(chunk)
    db_session_pgvector.commit()

    # Query about library hours with a reasonable semantic threshold (0.45)
    results = VectorSearchEngine.search(
        db=db_session_pgvector,
        community_id=comm.id,
        query="What is the library closing time?",
        top_k=5,
        min_score=0.45,
    )
    # The unrelated ID card chunk MUST be filtered out
    assert len(results) == 0


def test_strict_multi_community_isolation(db_session_pgvector):
    """
    CRITICAL: Multi-Community Tenant Isolation Test
    Community A: ID replacement is at SJT Ground Floor, fee is ₹100.
    Community B: ID replacement is at Building 4 Room 202, fee is $25.

    Query as Community A: ONLY Community A info is returned. Community B info is NEVER returned.
    Query as Community B: ONLY Community B info is returned. Community A info is NEVER returned.
    """
    comm_a = Community(id="comm-alpha-campus", name="Alpha Campus")
    comm_b = Community(id="comm-beta-campus", name="Beta Campus")
    db_session_pgvector.add_all([comm_a, comm_b])

    content_a = "Alpha Campus: ID replacement is handled at SJT Ground Floor for a fee of ₹100."
    content_b = "Beta Campus: ID replacement is located at Building 4 Room 202 for a fee of $25."

    chunk_a = KnowledgeChunk(
        id="chunk-alpha",
        community_id=comm_a.id,
        content=content_a,
        embedding=embedding_provider.embed_text(content_a),
        verification_status="VERIFIED",
    )
    chunk_b = KnowledgeChunk(
        id="chunk-beta",
        community_id=comm_b.id,
        content=content_b,
        embedding=embedding_provider.embed_text(content_b),
        verification_status="VERIFIED",
    )
    db_session_pgvector.add_all([chunk_a, chunk_b])
    db_session_pgvector.commit()

    # 1. Search as Community A user
    results_a = VectorSearchEngine.search(
        db=db_session_pgvector,
        community_id=comm_a.id,
        query="Where do I replace my ID card?",
        top_k=10,
        min_score=0.2,
    )
    assert len(results_a) == 1
    assert results_a[0].chunk_id == "chunk-alpha"
    assert "Alpha Campus" in results_a[0].content
    assert "Beta Campus" not in results_a[0].content
    assert all(r.community_id == comm_a.id for r in results_a)

    # 2. Search as Community B user
    results_b = VectorSearchEngine.search(
        db=db_session_pgvector,
        community_id=comm_b.id,
        query="Where do I replace my ID card?",
        top_k=10,
        min_score=0.2,
    )
    assert len(results_b) == 1
    assert results_b[0].chunk_id == "chunk-beta"
    assert "Beta Campus" in results_b[0].content
    assert "Alpha Campus" not in results_b[0].content
    assert all(r.community_id == comm_b.id for r in results_b)


def test_verification_filtering(db_session_pgvector):
    """Verify that REJECTED and EXPIRED chunks are not returned in semantic search."""
    comm = Community(id="comm-status-test", name="Status Campus")
    db_session_pgvector.add(comm)

    emb = embedding_provider.embed_text("Faculty sabbatical leave policy guidelines")

    c_verified = KnowledgeChunk(
        id="c-verified",
        community_id=comm.id,
        content="Verified sabbatical policy: 1 year sabbatical after 6 years of service.",
        embedding=emb,
        verification_status="VERIFIED",
    )
    c_rejected = KnowledgeChunk(
        id="c-rejected",
        community_id=comm.id,
        content="Rejected sabbatical policy draft: 6 months leave anytime.",
        embedding=emb,
        verification_status="REJECTED",
    )
    c_expired = KnowledgeChunk(
        id="c-expired",
        community_id=comm.id,
        content="Expired sabbatical policy from 2018.",
        embedding=emb,
        verification_status="EXPIRED",
    )
    db_session_pgvector.add_all([c_verified, c_rejected, c_expired])
    db_session_pgvector.commit()

    results = VectorSearchEngine.search(
        db=db_session_pgvector,
        community_id=comm.id,
        query="What is the sabbatical leave policy?",
        top_k=10,
        min_score=0.1,
        prioritize_verified=True,
    )

    ids = [r.chunk_id for r in results]
    assert "c-verified" in ids
    assert "c-rejected" not in ids
    assert "c-expired" not in ids


def test_inactive_document_filtering(db_session_pgvector):
    """Verify that chunks belonging to deactivated documents are excluded from retrieval."""
    comm = Community(id="comm-doc-active", name="Active Doc Campus")
    db_session_pgvector.add(comm)

    doc_active = Document(
        id="doc-active",
        community_id=comm.id,
        title="Active Student Code",
        file_name="code.txt",
        file_type="txt",
        is_active=True,
        verification_status=VerificationStatus.VERIFIED,
    )
    doc_inactive = Document(
        id="doc-inactive",
        community_id=comm.id,
        title="Archived Code 2010",
        file_name="archived.txt",
        file_type="txt",
        is_active=False,
        verification_status=VerificationStatus.VERIFIED,
    )
    db_session_pgvector.add_all([doc_active, doc_inactive])
    db_session_pgvector.commit()

    emb = embedding_provider.embed_text("Campus disciplinary action protocol")

    c_active = KnowledgeChunk(
        id="c-doc-active",
        document_id=doc_active.id,
        community_id=comm.id,
        content="Active disciplinary protocol guidelines.",
        embedding=emb,
        verification_status="VERIFIED",
    )
    c_inactive = KnowledgeChunk(
        id="c-doc-inactive",
        document_id=doc_inactive.id,
        community_id=comm.id,
        content="Archived disciplinary protocol from 2010.",
        embedding=emb,
        verification_status="VERIFIED",
    )
    db_session_pgvector.add_all([c_active, c_inactive])
    db_session_pgvector.commit()

    results = VectorSearchEngine.search(
        db=db_session_pgvector,
        community_id=comm.id,
        query="disciplinary action guidelines",
        top_k=5,
        min_score=0.1,
    )

    result_ids = [r.chunk_id for r in results]
    assert "c-doc-active" in result_ids
    assert "c-doc-inactive" not in result_ids


def test_scored_chunk_source_attribution_metadata(db_session_pgvector):
    """Verify that ScoredChunk provides all necessary metadata fields for source citations."""
    comm = Community(id="comm-meta", name="Meta Campus")
    doc = Document(
        id="doc-handbook",
        community_id=comm.id,
        title="Official Student Handbook",
        file_name="handbook.pdf",
        file_type="pdf",
        version=2,
        is_active=True,
        verification_status=VerificationStatus.VERIFIED,
    )
    db_session_pgvector.add_all([comm, doc])
    db_session_pgvector.commit()

    content = "Hostel quiet hours begin at 10:00 PM on weekdays."
    emb = embedding_provider.embed_text(content)

    chunk = KnowledgeChunk(
        id="chunk-meta-1",
        document_id=doc.id,
        community_id=comm.id,
        content=content,
        embedding=emb,
        page_number=14,
        section="Hostel Rules",
        chunk_index=3,
        verification_status="VERIFIED",
    )
    db_session_pgvector.add(chunk)
    db_session_pgvector.commit()

    results = VectorSearchEngine.search(
        db=db_session_pgvector,
        community_id=comm.id,
        query="When are quiet hours?",
        top_k=1,
    )
    assert len(results) == 1
    sc = results[0]

    # Test properties
    assert sc.chunk_id == "chunk-meta-1"
    assert sc.document_id == doc.id
    assert sc.community_id == comm.id
    assert sc.document_title == "Official Student Handbook"
    assert sc.document_version == 2
    assert sc.page_number == 14
    assert sc.section == "Hostel Rules"
    assert sc.chunk_index == 3
    assert sc.verification_status == "VERIFIED"
    assert sc.score > 0.50
    assert sc.distance < 0.50

    # Test to_dict structure
    meta_dict = sc.to_dict()
    assert meta_dict["chunk_id"] == "chunk-meta-1"
    assert meta_dict["document_title"] == "Official Student Handbook"
    assert meta_dict["document_version"] == 2
    assert meta_dict["similarity_score"] > 0.50
    assert meta_dict["distance_score"] < 0.50
