import io
import sys
import pytest
from sqlalchemy import create_engine
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import sessionmaker
from alembic.config import Config
from alembic import command

from app.database.base import Base
from app.models.community import Community
from app.models.document import Document
from app.models.chunk import KnowledgeChunk
from app.ai.retrieval.embeddings import embedding_provider
from app.ai.retrieval.vector_search import VectorSearchEngine
from app.ai.retrieval.keyword_search import KeywordSearchEngine
from app.ai.retrieval.hybrid_search import HybridRetriever, HybridSearchResult


@pytest.fixture
def db_session_hybrid():
    """Isolated in-memory database session for hybrid retrieval tests."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()


def test_postgresql_fts_sql_generation(db_session_hybrid):
    """
    Verify KeywordSearchEngine compiles native PostgreSQL Full-Text Search SQL:
    - Uses websearch_to_tsquery('english', ...)
    - Uses ts_rank_cd(search_vector, ...)
    - Uses PostgreSQL full-text search @@ match operator
    - Enforces community isolation and verification filters
    - Enforces document active status filter
    """
    dialect = postgresql.dialect()
    stmt = KeywordSearchEngine.build_fts_query(
        community_id="comm-fts-test",
        query="Where is SJT-G12?",
        top_k=5,
        min_score=0.1,
    )
    compiled = str(stmt.compile(dialect=dialect))

    assert "websearch_to_tsquery" in compiled
    assert "ts_rank_cd" in compiled
    assert "@@" in compiled
    assert "knowledge_chunks.community_id" in compiled
    assert "knowledge_chunks.verification_status NOT IN" in compiled
    assert "documents.is_active" in compiled
    assert "LIMIT" in compiled


def test_alembic_fts_migration_sql_generation():
    """
    Verify Alembic migration 00603d0400cb -> e1f2a3b4c5d6 emits:
    - tsvector GENERATED ALWAYS AS (to_tsvector(...)) STORED
    - CREATE INDEX ... USING gin (search_vector)
    """
    cfg = Config("backend/alembic.ini")
    cfg.set_main_option("sqlalchemy.url", "postgresql://nexora_admin:password@localhost:5432/nexora_db")

    captured_stdout = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = captured_stdout

    try:
        command.upgrade(cfg, "00603d0400cb:e1f2a3b4c5d6", sql=True)
    finally:
        sys.stdout = old_stdout

    sql_output = captured_stdout.getvalue()
    assert "search_vector tsvector" in sql_output
    assert "to_tsvector('english'" in sql_output
    assert "idx_knowledge_chunks_search_vector_gin" in sql_output
    assert "USING gin (search_vector)" in sql_output


def test_exact_identifier_query_sjt_g12(db_session_hybrid):
    """
    STEP 4 & 16: Verify exact institutional identifier 'SJT-G12' retrieval.
    User Question: 'Where is SJT-G12?'
    Expected: Chunk mentioning SJT-G12 ranks highest.
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    doc = Document(
        id="doc_campus_guide",
        community_id=comm.id,
        title="Campus Service Guide",
        file_name="guide.txt",
        file_type="text/plain",
        is_active=True,
    )
    db_session_hybrid.add_all([comm, doc])

    text_g12 = "SJT-G12 is the ID card replacement counter located on the SJT Ground Floor."
    text_other = "Student Affairs is located in the Main Building on the Second Floor."

    emb_g12 = embedding_provider.embed_text(text_g12)
    emb_other = embedding_provider.embed_text(text_other)

    chunk_g12 = KnowledgeChunk(
        id="chunk_sjt_g12",
        document_id=doc.id,
        community_id=comm.id,
        content=text_g12,
        embedding=emb_g12,
        section="ID Services",
        page_number=1,
        verification_status="VERIFIED",
    )
    chunk_other = KnowledgeChunk(
        id="chunk_other_office",
        document_id=doc.id,
        community_id=comm.id,
        content=text_other,
        embedding=emb_other,
        section="Administrative Offices",
        page_number=4,
        verification_status="VERIFIED",
    )
    db_session_hybrid.add_all([chunk_g12, chunk_other])
    db_session_hybrid.commit()

    retriever = HybridRetriever(vector_weight=0.6, keyword_weight=0.4)
    results = retriever.search(
        db=db_session_hybrid,
        community_id=comm.id,
        query="Where is SJT-G12?",
        top_k=5,
    )

    assert len(results) > 0
    top_result = results[0]
    assert top_result.chunk.id == "chunk_sjt_g12"
    assert "SJT-G12" in top_result.chunk.content
    assert top_result.keyword_score > 0.0
    assert "keyword" in top_result.retrieval_sources


def test_semantic_only_relevant_query(db_session_hybrid):
    """
    Test semantic retrieval where keywords differ but semantics match.
    Query: 'procedure for smart credential retrieval'
    Text: 'Students who have lost their ID card must visit Student Services located at SJT Ground Floor.'
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    db_session_hybrid.add(comm)

    text_id = "Students who have lost their ID card must visit Student Services located at SJT Ground Floor. Replacement fee is 100."
    emb_id = embedding_provider.embed_text(text_id)

    chunk = KnowledgeChunk(
        id="chunk_id_service",
        community_id=comm.id,
        content=text_id,
        embedding=emb_id,
        verification_status="VERIFIED",
    )
    db_session_hybrid.add(chunk)
    db_session_hybrid.commit()

    retriever = HybridRetriever()
    results = retriever.search(
        db=db_session_hybrid,
        community_id=comm.id,
        query="procedure for student credentials and badges",
        top_k=3,
    )

    assert len(results) > 0
    assert results[0].chunk.id == "chunk_id_service"
    assert results[0].vector_score > 0.0


def test_keyword_only_strong_match(db_session_hybrid):
    """
    Test keyword-driven match when a specific rare term is present.
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    db_session_hybrid.add(comm)

    text_rare = "The laboratory requisition form requires signature from Dr. Aris Thorne."
    chunk = KnowledgeChunk(
        id="chunk_rare_doc",
        community_id=comm.id,
        content=text_rare,
        embedding=embedding_provider.embed_text(text_rare),
        verification_status="VERIFIED",
    )
    db_session_hybrid.add(chunk)
    db_session_hybrid.commit()

    retriever = HybridRetriever()
    results = retriever.search(
        db=db_session_hybrid,
        community_id=comm.id,
        query="Aris Thorne requisition",
        top_k=3,
    )

    assert len(results) > 0
    assert results[0].chunk.id == "chunk_rare_doc"
    assert "keyword" in results[0].retrieval_sources


def test_hybrid_score_fusion_calculation(db_session_hybrid):
    """
    Verify the hybrid score fusion formula:
    final_score = (vector_weight * norm_v) + (keyword_weight * norm_k) + verification_bonus
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    db_session_hybrid.add(comm)

    text = "The central library closes promptly at 8 PM on weekdays."
    chunk = KnowledgeChunk(
        id="chunk_lib",
        community_id=comm.id,
        content=text,
        embedding=embedding_provider.embed_text(text),
        verification_status="VERIFIED",
    )
    db_session_hybrid.add(chunk)
    db_session_hybrid.commit()

    retriever = HybridRetriever(vector_weight=0.6, keyword_weight=0.4, verification_bonus=0.25)
    results = retriever.search(
        db=db_session_hybrid,
        community_id=comm.id,
        query="library closing time 8 PM",
        top_k=1,
    )

    assert len(results) == 1
    res = results[0]
    expected_fused = (0.6 * res.vector_score) + (0.4 * 1.0) + 0.25
    assert abs(res.final_score - expected_fused) < 1e-3


def test_same_chunk_dual_retrieval_sources(db_session_hybrid):
    """
    Verify that when a chunk matches both semantic vector search and keyword search,
    it is merged cleanly and lists retrieval_sources = ['semantic', 'keyword'].
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    db_session_hybrid.add(comm)

    text = "Students can replace damaged ID cards at the designated ID Card Service Counter."
    chunk = KnowledgeChunk(
        id="chunk_dual",
        community_id=comm.id,
        content=text,
        embedding=embedding_provider.embed_text(text),
        verification_status="VERIFIED",
    )
    db_session_hybrid.add(chunk)
    db_session_hybrid.commit()

    retriever = HybridRetriever()
    results = retriever.search(
        db=db_session_hybrid,
        community_id=comm.id,
        query="replace damaged ID cards service counter",
        top_k=5,
    )

    assert len(results) > 0
    res = results[0]
    assert "semantic" in res.retrieval_sources
    assert "keyword" in res.retrieval_sources
    assert res.vector_score > 0.0
    assert res.keyword_score > 0.0


def test_strict_community_isolation(db_session_hybrid):
    """
    STEP 8: Ensure Community A query NEVER retrieves Community B chunks in hybrid search.
    """
    comm_a = Community(id="comm_alpha", name="Campus Alpha")
    comm_b = Community(id="comm_beta", name="Campus Beta")
    db_session_hybrid.add_all([comm_a, comm_b])

    text_a = "Campus Alpha ID replacement is at Building A Room 101."
    text_b = "Campus Beta ID replacement is at Building B Room 202."

    chunk_a = KnowledgeChunk(
        id="chunk_a",
        community_id=comm_a.id,
        content=text_a,
        embedding=embedding_provider.embed_text(text_a),
        verification_status="VERIFIED",
    )
    chunk_b = KnowledgeChunk(
        id="chunk_b",
        community_id=comm_b.id,
        content=text_b,
        embedding=embedding_provider.embed_text(text_b),
        verification_status="VERIFIED",
    )
    db_session_hybrid.add_all([chunk_a, chunk_b])
    db_session_hybrid.commit()

    retriever = HybridRetriever()

    # Query as Community Alpha
    results_a = retriever.search(db_session_hybrid, comm_a.id, "ID replacement Building", top_k=10)
    assert len(results_a) > 0
    assert all(r.chunk.community_id == comm_a.id for r in results_a)
    assert not any(r.chunk.id == "chunk_b" for r in results_a)

    # Query as Community Beta
    results_b = retriever.search(db_session_hybrid, comm_b.id, "ID replacement Building", top_k=10)
    assert len(results_b) > 0
    assert all(r.chunk.community_id == comm_b.id for r in results_b)
    assert not any(r.chunk.id == "chunk_a" for r in results_b)


def test_rejected_and_expired_chunk_filtering(db_session_hybrid):
    """
    STEP 8: Ensure REJECTED and EXPIRED chunks are never retrieved in hybrid search.
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    db_session_hybrid.add(comm)

    text_verified = "Valid parking rules: park only in designated yellow bays."
    text_rejected = "Old parking rules: park anywhere on the grass lawn."
    text_expired = "Expired 2022 parking rules: permit fee is 50."

    c_verified = KnowledgeChunk(
        id="c_ver",
        community_id=comm.id,
        content=text_verified,
        embedding=embedding_provider.embed_text(text_verified),
        verification_status="VERIFIED",
    )
    c_rejected = KnowledgeChunk(
        id="c_rej",
        community_id=comm.id,
        content=text_rejected,
        embedding=embedding_provider.embed_text(text_rejected),
        verification_status="REJECTED",
    )
    c_expired = KnowledgeChunk(
        id="c_exp",
        community_id=comm.id,
        content=text_expired,
        embedding=embedding_provider.embed_text(text_expired),
        verification_status="EXPIRED",
    )
    db_session_hybrid.add_all([c_verified, c_rejected, c_expired])
    db_session_hybrid.commit()

    retriever = HybridRetriever()
    results = retriever.search(db_session_hybrid, comm.id, "parking rules permit bays", top_k=10)

    result_ids = [r.chunk.id for r in results]
    assert "c_ver" in result_ids
    assert "c_rej" not in result_ids
    assert "c_exp" not in result_ids


def test_inactive_document_filtering(db_session_hybrid):
    """
    STEP 9: Ensure chunks belonging to inactive document versions are excluded.
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    doc_active = Document(
        id="doc_v2",
        community_id=comm.id,
        title="Handbook v2",
        file_name="handbook_v2.txt",
        file_type="text/plain",
        is_active=True,
    )
    doc_inactive = Document(
        id="doc_v1",
        community_id=comm.id,
        title="Handbook v1",
        file_name="handbook_v1.txt",
        file_type="text/plain",
        is_active=False,
    )
    db_session_hybrid.add_all([comm, doc_active, doc_inactive])

    chunk_active = KnowledgeChunk(
        id="chunk_active",
        document_id=doc_active.id,
        community_id=comm.id,
        content="Active policy: Tuition refund cutoff is 30 days.",
        embedding=embedding_provider.embed_text("Tuition refund cutoff is 30 days."),
        verification_status="VERIFIED",
    )
    chunk_inactive = KnowledgeChunk(
        id="chunk_inactive",
        document_id=doc_inactive.id,
        community_id=comm.id,
        content="Obsolete policy: Tuition refund cutoff is 10 days.",
        embedding=embedding_provider.embed_text("Tuition refund cutoff is 10 days."),
        verification_status="VERIFIED",
    )
    db_session_hybrid.add_all([chunk_active, chunk_inactive])
    db_session_hybrid.commit()

    retriever = HybridRetriever()
    results = retriever.search(db_session_hybrid, comm.id, "tuition refund cutoff policy", top_k=10)

    result_ids = [r.chunk.id for r in results]
    assert "chunk_active" in result_ids
    assert "chunk_inactive" not in result_ids


def test_exact_numeric_and_room_identifier_retrieval(db_session_hybrid):
    """
    STEP 10 & 16: Verify exact room number queries ('Room 104', 'TT-402', 'Block A').
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    db_session_hybrid.add(comm)

    text_104 = "Room 104 is the Advanced Robotics Research Facility in Technology Tower."
    text_402 = "TT-402 is the Faculty Development Center located on Floor 4."
    text_block_a = "Block A houses the Department of Computer Science."

    c_104 = KnowledgeChunk(
        id="c_104",
        community_id=comm.id,
        content=text_104,
        embedding=embedding_provider.embed_text(text_104),
        verification_status="VERIFIED",
    )
    c_402 = KnowledgeChunk(
        id="c_402",
        community_id=comm.id,
        content=text_402,
        embedding=embedding_provider.embed_text(text_402),
        verification_status="VERIFIED",
    )
    c_block = KnowledgeChunk(
        id="c_block",
        community_id=comm.id,
        content=text_block_a,
        embedding=embedding_provider.embed_text(text_block_a),
        verification_status="VERIFIED",
    )
    db_session_hybrid.add_all([c_104, c_402, c_block])
    db_session_hybrid.commit()

    retriever = HybridRetriever(vector_weight=0.5, keyword_weight=0.5)

    res_104 = retriever.search(db_session_hybrid, comm.id, "Where is Room 104?", top_k=2)
    assert len(res_104) > 0
    assert res_104[0].chunk.id == "c_104"

    res_402 = retriever.search(db_session_hybrid, comm.id, "Where is TT-402?", top_k=2)
    assert len(res_402) > 0
    assert res_402[0].chunk.id == "c_402"

    res_block = retriever.search(db_session_hybrid, comm.id, "Which department is in Block A?", top_k=2)
    assert len(res_block) > 0
    assert res_block[0].chunk.id == "c_block"


def test_unrelated_query_rejected_under_threshold(db_session_hybrid):
    """
    STEP 12 & 16: An unrelated query ('Where is the library?') against ID card knowledge
    must return NO results when min_score threshold is applied.
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    db_session_hybrid.add(comm)

    text_id = "Students who have lost their ID card must visit Student Services at SJT Ground Floor."
    chunk = KnowledgeChunk(
        id="chunk_id_only",
        community_id=comm.id,
        content=text_id,
        embedding=embedding_provider.embed_text(text_id),
        verification_status="VERIFIED",
    )
    db_session_hybrid.add(chunk)
    db_session_hybrid.commit()

    retriever = HybridRetriever()
    # High threshold for unrelated query
    results = retriever.search(
        db=db_session_hybrid,
        community_id=comm.id,
        query="What is the astronomy observatory telescope opening schedule?",
        top_k=5,
        min_score=0.75,
    )

    assert len(results) == 0


def test_top_k_enforcement(db_session_hybrid):
    """
    STEP 10: Ensure top_k strictly limits the returned result count.
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    db_session_hybrid.add(comm)

    chunks = []
    for i in range(8):
        txt = f"Campus announcement rule number {i}: maintain quiet in examination halls."
        chunks.append(
            KnowledgeChunk(
                id=f"c_ann_{i}",
                community_id=comm.id,
                content=txt,
                embedding=embedding_provider.embed_text(txt),
                verification_status="VERIFIED",
            )
        )
    db_session_hybrid.add_all(chunks)
    db_session_hybrid.commit()

    retriever = HybridRetriever()
    results = retriever.search(db_session_hybrid, comm.id, "examination hall rules", top_k=3)
    assert len(results) == 3


def test_metadata_and_source_attribution_to_dict(db_session_hybrid):
    """
    STEP 7 & 14: Verify to_dict() provides complete source attribution metadata.
    """
    comm = Community(id="comm_vit", name="VIT Campus")
    doc = Document(
        id="doc_handbook",
        community_id=comm.id,
        title="Student Handbook",
        file_name="handbook.txt",
        file_type="text/plain",
        version=2,
        is_active=True,
    )
    db_session_hybrid.add_all([comm, doc])

    text = "Hostel gate closes at 9:00 PM for undergraduate students."
    chunk = KnowledgeChunk(
        id="c_hostel",
        document_id=doc.id,
        community_id=comm.id,
        content=text,
        embedding=embedding_provider.embed_text(text),
        section="Hostel Regulations",
        page_number=12,
        chunk_index=3,
        verification_status="VERIFIED",
    )
    db_session_hybrid.add(chunk)
    db_session_hybrid.commit()

    retriever = HybridRetriever()
    results = retriever.search(db_session_hybrid, comm.id, "Hostel gate closing timing", top_k=1)
    assert len(results) == 1

    d = results[0].to_dict()
    assert d["chunk_id"] == "c_hostel"
    assert d["document_id"] == "doc_handbook"
    assert d["document_title"] == "Student Handbook"
    assert d["document_version"] == 2
    assert d["section"] == "Hostel Regulations"
    assert d["page_number"] == 12
    assert d["verification_status"] == "VERIFIED"
    assert "semantic_score" in d
    assert "keyword_score" in d
    assert "hybrid_score" in d
    assert "retrieval_sources" in d


def test_sqlite_fallback_behavior(db_session_hybrid):
    """
    STEP 13.15: Verify that SQLite database engine triggers the test fallback gracefully
    and logs an informative warning notice.
    """
    from unittest.mock import patch
    comm = Community(id="comm_sqlite_test", name="SQLite Community")
    db_session_hybrid.add(comm)

    text = "Campus security hotline is extension 999."
    chunk = KnowledgeChunk(
        id="c_sec",
        community_id=comm.id,
        content=text,
        embedding=embedding_provider.embed_text(text),
        verification_status="VERIFIED",
    )
    db_session_hybrid.add(chunk)
    db_session_hybrid.commit()

    with patch("app.ai.retrieval.keyword_search.logger.warning") as mock_warn:
        results = KeywordSearchEngine.search(
            db=db_session_hybrid,
            community_id=comm.id,
            query="security hotline extension",
            top_k=5,
        )

    assert len(results) == 1
    assert results[0].chunk.id == "c_sec"
    assert mock_warn.called
    assert "SQLite detected in KeywordSearchEngine" in mock_warn.call_args[0][0]
