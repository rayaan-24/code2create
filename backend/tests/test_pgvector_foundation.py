import pytest
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from pgvector.sqlalchemy import Vector
from alembic.config import Config
from alembic import command
import io
import sys

from app.models.chunk import KnowledgeChunk
from app.models.community import Community, CommunityType
from app.ai.retrieval.vector_search import VectorSearchEngine, ScoredChunk
from app.ai.retrieval.embeddings import embedding_provider


def test_knowledge_chunk_384d_vector_storage(db_session, community_a):
    """
    Verify:
    1. A KnowledgeChunk can be inserted with a 384-dimensional vector.
    2. A KnowledgeChunk can be retrieved and retains full vector precision.
    3. Legacy embedding_json is kept in sync as a safe fallback.
    """
    test_vec = [float(i) / 384.0 for i in range(384)]
    
    chunk = KnowledgeChunk(
        community_id=community_a.id,
        content="Testing pgvector native 384-dimensional vector storage.",
        section="Section Vector Test",
        page_number=1,
        verification_status="VERIFIED",
        embedding=test_vec,
    )
    db_session.add(chunk)
    db_session.commit()
    db_session.refresh(chunk)

    # Retrieval verification
    retrieved = db_session.query(KnowledgeChunk).filter(KnowledgeChunk.id == chunk.id).first()
    assert retrieved is not None
    assert retrieved.embedding is not None
    assert len(retrieved.embedding) == 384
    assert retrieved.vector == retrieved.embedding
    assert abs(retrieved.embedding[0] - 0.0) < 1e-6
    assert abs(retrieved.embedding[383] - (383.0 / 384.0)) < 1e-6

    # Verify backward-compatible JSON sync
    assert retrieved.embedding_json is not None
    assert retrieved.embedding_json.startswith("[")


def test_knowledge_chunk_tenant_and_status_filtering(db_session):
    """
    Verify:
    3. community_id filtering works properly (tenant isolation).
    4. verification_status filtering works properly.
    """
    # Create two test communities
    c1 = Community(id="test_comm_1", name="Comm 1", type=CommunityType.UNIVERSITY)
    c2 = Community(id="test_comm_2", name="Comm 2", type=CommunityType.UNIVERSITY)
    db_session.add_all([c1, c2])
    db_session.commit()

    vec_1 = [0.1] * 384
    vec_2 = [0.2] * 384
    vec_3 = [0.3] * 384

    ch_1_verified = KnowledgeChunk(
        community_id="test_comm_1",
        content="Comm 1 verified policy",
        verification_status="VERIFIED",
        embedding=vec_1,
    )
    ch_1_rejected = KnowledgeChunk(
        community_id="test_comm_1",
        content="Comm 1 rejected guideline",
        verification_status="REJECTED",
        embedding=vec_2,
    )
    ch_2_verified = KnowledgeChunk(
        community_id="test_comm_2",
        content="Comm 2 verified notice",
        verification_status="VERIFIED",
        embedding=vec_3,
    )
    db_session.add_all([ch_1_verified, ch_1_rejected, ch_2_verified])
    db_session.commit()

    # Test community filtering
    comm_1_chunks = db_session.query(KnowledgeChunk).filter(
        KnowledgeChunk.community_id == "test_comm_1"
    ).all()
    assert len(comm_1_chunks) == 2
    assert all(c.community_id == "test_comm_1" for c in comm_1_chunks)

    # Test status filtering
    comm_1_verified = db_session.query(KnowledgeChunk).filter(
        KnowledgeChunk.community_id == "test_comm_1",
        KnowledgeChunk.verification_status == "VERIFIED",
    ).all()
    assert len(comm_1_verified) == 1
    assert comm_1_verified[0].content == "Comm 1 verified policy"


def test_vector_search_engine_execution(db_session, community_a):
    """
    Verify VectorSearchEngine search executes cleanly and returns scored chunks.
    """
    results = VectorSearchEngine.search(
        db=db_session,
        community_id=community_a.id,
        query="Student ID Card Replacement",
        top_k=5,
    )
    assert isinstance(results, list)
    assert len(results) > 0
    assert isinstance(results[0], ScoredChunk)
    assert results[0].score >= 0.0
    assert results[0].chunk.community_id == community_a.id


def test_pgvector_sql_compilation_and_operators():
    """
    Verify:
    5. PostgreSQL accepts vector values and compiles distance operators.
    6. Vector similarity operations (<=>) compile properly for PostgreSQL.
    """
    dialect = postgresql.dialect()
    test_vec = [0.1] * 384

    # 1. Cosine Distance Operator (<=>)
    stmt_cosine = sa.select(
        KnowledgeChunk.id,
        KnowledgeChunk.embedding.cosine_distance(test_vec).label("cos_dist")
    )
    compiled_cosine = str(stmt_cosine.compile(dialect=dialect))
    assert "<=>" in compiled_cosine
    assert "knowledge_chunks.embedding" in compiled_cosine

    # 2. L2 Euclidean Distance Operator (<->)
    stmt_l2 = sa.select(
        KnowledgeChunk.id,
        KnowledgeChunk.embedding.l2_distance(test_vec).label("l2_dist")
    )
    compiled_l2 = str(stmt_l2.compile(dialect=dialect))
    assert "<->" in compiled_l2

    # 3. Inner Product Operator (<#>)
    stmt_ip = sa.select(
        KnowledgeChunk.id,
        KnowledgeChunk.embedding.max_inner_product(test_vec).label("ip_dist")
    )
    compiled_ip = str(stmt_ip.compile(dialect=dialect))
    assert "<#>" in compiled_ip


def test_alembic_pgvector_migration_sql_generation():
    """
    Verify Alembic PostgreSQL migration emits the exact pgvector DDL commands:
    - CREATE EXTENSION IF NOT EXISTS vector;
    - VECTOR(384) column
    - HNSW vector index USING hnsw (embedding vector_cosine_ops)
    - Metadata and community indexes
    """
    import os
    ini_path = "backend/alembic.ini" if os.path.exists("backend/alembic.ini") else "alembic.ini"
    cfg = Config(ini_path)
    cfg.set_main_option("sqlalchemy.url", "postgresql://nexora_admin:password@localhost:5432/nexora_db")

    captured_stdout = io.StringIO()
    old_stdout = sys.stdout
    sys.stdout = captured_stdout

    try:
        command.upgrade(cfg, "4a11fcd9f612:00603d0400cb", sql=True)
    finally:
        sys.stdout = old_stdout

    sql_output = captured_stdout.getvalue()

    assert "CREATE EXTENSION IF NOT EXISTS vector;" in sql_output
    assert "ADD COLUMN embedding VECTOR(384);" in sql_output
    assert "idx_knowledge_chunks_embedding_hnsw" in sql_output
    assert "USING hnsw (embedding vector_cosine_ops)" in sql_output
    assert "ix_knowledge_chunks_community_id" in sql_output
    assert "ix_knowledge_chunks_verification_status" in sql_output
    assert "ix_knowledge_chunks_community_status" in sql_output
    assert "embedding_json::vector" in sql_output
