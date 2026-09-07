import pytest
from app.models.community import Community
from app.models.user import User, UserRole
from app.models.document import Document
from app.models.chunk import KnowledgeChunk
from app.ai.retrieval.embeddings import embedding_provider
from app.ai.orchestrator import AIOrchestrator
from app.ai.safety.grounding import UNVERIFIED_STANDARD_REFUSAL
from app.core.security import hash_password


@pytest.fixture
def hybrid_test_data(db_session):
    """Seed test database with realistic campus data for SJT-G12, Library, and hours."""
    comm = Community(id="comm_hybrid_test", name="Nexora Institute of Technology")
    user = User(
        id="user_hybrid_test",
        community_id=comm.id,
        name="Alex River",
        email="alex@nexora.edu",
        password_hash=hash_password("Pass@123"),
        role=UserRole.USER,
        is_active=True,
    )
    db_session.add_all([comm, user])

    # Campus Document: Student Services and Facilities
    doc = Document(
        id="doc_campus_guide",
        community_id=comm.id,
        title="Official Campus Directory & Hours",
        file_name="campus_guide.pdf",
        file_type="application/pdf",
        version=1,
        is_active=True,
    )
    c1_text = "Student Services Center is located in SJT-G12 on the Ground Floor of Silver Jubilee Tower."
    c1 = KnowledgeChunk(
        id="chunk_sjt_g12",
        document_id=doc.id,
        community_id=comm.id,
        content=c1_text,
        embedding=embedding_provider.embed_text(c1_text),
        section="Student Services",
        page_number=1,
        verification_status="VERIFIED",
    )
    c2_text = "The Central Library is open Monday to Friday from 8:00 AM to 11:00 PM, and Saturday to Sunday from 9:00 AM to 6:00 PM."
    c2 = KnowledgeChunk(
        id="chunk_library_hours",
        document_id=doc.id,
        community_id=comm.id,
        content=c2_text,
        embedding=embedding_provider.embed_text(c2_text),
        section="Library Services",
        page_number=4,
        verification_status="VERIFIED",
    )
    db_session.add_all([doc, c1, c2])
    db_session.commit()
    return user, comm


@pytest.mark.asyncio
async def test_scenario_1_sjt_g12_organization(db_session, hybrid_test_data):
    """Test 1: 'Where is SJT-G12?' -> Uses organization knowledge/location accurately."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="Where is SJT-G12?",
    )
    assert response is not None
    assert response.answer != UNVERIFIED_STANDARD_REFUSAL
    assert "SJT" in response.answer or "Silver Jubilee" in response.answer or "Ground Floor" in response.answer or "G12" in response.answer


@pytest.mark.asyncio
async def test_scenario_2_quantum_computing_general(db_session, hybrid_test_data):
    """Test 2: 'What is quantum computing?' -> Normal LLM answer, NOT community refusal."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="What is quantum computing?",
    )
    assert response is not None
    assert UNVERIFIED_STANDARD_REFUSAL not in response.answer
    assert "qubit" in response.answer.lower() or "superposition" in response.answer.lower() or "quantum" in response.answer.lower()


@pytest.mark.asyncio
async def test_scenario_3_python_decorators_coding(db_session, hybrid_test_data):
    """Test 3: 'Explain Python decorators.' -> Normal LLM answer with explanation and example."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="Explain Python decorators with an example.",
    )
    assert response is not None
    assert UNVERIFIED_STANDARD_REFUSAL not in response.answer
    assert "def " in response.answer or "wrapper" in response.answer.lower() or "decorator" in response.answer.lower()


@pytest.mark.asyncio
async def test_scenario_4_latest_ai_news_web(db_session, hybrid_test_data):
    """Test 4: 'What is the latest AI news?' -> SerpApi / Web search -> LLM current answer."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="What is the latest AI news?",
    )
    assert response is not None
    assert UNVERIFIED_STANDARD_REFUSAL not in response.answer
    assert "search_web" in response.tools_used or response.is_external is True
    assert len(response.answer) > 30


@pytest.mark.asyncio
async def test_scenario_5_central_library_location(db_session, hybrid_test_data):
    """Test 5: 'Where is the Central Library?' -> Organization location data/navigation."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="Where is the Central Library?",
    )
    assert response is not None
    assert "Library" in response.answer or "Commons" in response.answer or "Level" in response.answer or response.structured_card is not None


@pytest.mark.asyncio
async def test_scenario_6_professor_email_creative(db_session, hybrid_test_data):
    """Test 6: 'Write an email asking my professor for an extension.' -> LLM-generated email."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="Write an email asking my professor for an extension.",
    )
    assert response is not None
    assert UNVERIFIED_STANDARD_REFUSAL not in response.answer
    assert "dear professor" in response.answer.lower() or "extension" in response.answer.lower()


@pytest.mark.asyncio
async def test_scenario_7_microsoft_ceo_web(db_session, hybrid_test_data):
    """Test 7: 'Who is the current CEO of Microsoft?' -> Web search -> LLM synthesis (Satya Nadella)."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="Who is the current CEO of Microsoft?",
    )
    assert response is not None
    assert UNVERIFIED_STANDARD_REFUSAL not in response.answer
    assert "Satya" in response.answer or "Nadella" in response.answer or "search_web" in response.tools_used


@pytest.mark.asyncio
async def test_scenario_8_library_multi_tool(db_session, hybrid_test_data):
    """Test 8: 'Tell me where the library is and give me directions.' -> Multi-tool."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="Tell me where the library is and give me directions.",
    )
    assert response is not None
    assert UNVERIFIED_STANDARD_REFUSAL not in response.answer
    assert response.requires_navigation is True or "route" in response.tools_used or "calculate_route" in response.tools_used or "library" in response.answer.lower()


@pytest.mark.asyncio
async def test_scenario_9_library_opening_hours_org(db_session, hybrid_test_data):
    """Test 9: 'What are the opening hours of the library?' -> Organization database/RAG."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="What are the opening hours of the library?",
    )
    assert response is not None
    assert UNVERIFIED_STANDARD_REFUSAL not in response.answer
    assert any(h in response.answer.lower() for h in ["8", "11", "9", "open", "schedule", "hour"])


@pytest.mark.asyncio
async def test_scenario_10_postgresql_vs_mongodb_coding(db_session, hybrid_test_data):
    """Test 10: 'Explain the difference between PostgreSQL and MongoDB.' -> Normal LLM answer."""
    user, comm = hybrid_test_data
    orchestrator = AIOrchestrator()
    response = await orchestrator.process_chat(
        db=db_session,
        current_user=user,
        community=comm,
        raw_message="Explain the difference between PostgreSQL and MongoDB.",
    )
    assert response is not None
    assert UNVERIFIED_STANDARD_REFUSAL not in response.answer
    assert "relational" in response.answer.lower() or "nosql" in response.answer.lower() or "document" in response.answer.lower() or "sql" in response.answer.lower()
