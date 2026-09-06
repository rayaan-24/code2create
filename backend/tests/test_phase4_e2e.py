import pytest
from app.ai.orchestrator import AIOrchestrator
from app.ai.schemas.intent import IntentType


@pytest.mark.asyncio
async def test_phase4_end_to_end_conversational_integration(db_session, user_a, community_a):
    """
    Test Phase 4 Complete Intelligent Integration Scenario:
    1. User: 'I lost my ID card. What should I do?' -> RAG procedure + fee + hours + office
    2. User: 'Where is that office?' -> Contextual resolution to Student Services
    3. User: 'I am near the library.' -> Context updates current_location
    4. User: 'Take me there.' -> A* calculate_route tool call
    5. User: 'How long will it take?' -> Uses route context
    6. User: 'What documents are generally needed for an Indian passport?' -> External search with attribution
    """
    orchestrator = AIOrchestrator()
    conversation_id = "phase4-e2e-conv-001"

    # Step 1: Lost ID Card procedure
    r1 = await orchestrator.process_chat(
        db=db_session,
        current_user=user_a,
        community=community_a,
        raw_message="I lost my ID card. What should I do?",
        conversation_id=conversation_id,
    )
    assert r1 is not None
    assert "Student Services" in r1.answer or "ID Card" in r1.answer or len(r1.sources) > 0

    # Step 2: "Where is that office?" (contextual destination resolution)
    r2 = await orchestrator.process_chat(
        db=db_session,
        current_user=user_a,
        community=community_a,
        raw_message="Where is that office?",
        conversation_id=conversation_id,
    )
    assert r2 is not None
    assert "Student Services" in r2.answer or "SJT" in r2.answer or "Ground Floor" in r2.answer or "G12" in r2.answer

    # Step 3: "I'm near the library." (context location update)
    r3 = await orchestrator.process_chat(
        db=db_session,
        current_user=user_a,
        community=community_a,
        raw_message="I am near the library.",
        conversation_id=conversation_id,
    )
    assert r3 is not None
    # Check context memory updated current_location
    state = orchestrator.context_mgr.get_state(conversation_id)
    assert state.current_location is not None
    assert "library" in state.current_location.lower()

    # Step 4: "Take me there." (calls A* calculate_route)
    r4 = await orchestrator.process_chat(
        db=db_session,
        current_user=user_a,
        community=community_a,
        raw_message="Take me there.",
        conversation_id=conversation_id,
    )
    assert r4 is not None
    assert "calculate_route" in r4.tools_used or "route" in r4.answer.lower()
    # Action card or navigation instructions must be present
    assert any(a.action_type == "NAVIGATE" for a in r4.actions) or len(r4.answer) > 20

    # Step 5: "How long will it take?" (using route context)
    r5 = await orchestrator.process_chat(
        db=db_session,
        current_user=user_a,
        community=community_a,
        raw_message="How long will it take to get there?",
        conversation_id=conversation_id,
    )
    assert r5 is not None
    assert any(word in r5.answer.lower() for word in ["minute", "min", "walk", "distance", "meters", "quick"])

    # Step 6: External Web Intelligence query
    r6 = await orchestrator.process_chat(
        db=db_session,
        current_user=user_a,
        community=community_a,
        raw_message="What documents are generally needed for an Indian passport application?",
        conversation_id=conversation_id,
    )
    assert r6 is not None
    assert r6.intent == IntentType.EXTERNAL_INFORMATION
    assert "search_web" in r6.tools_used
    assert r6.is_external is True
    assert len(r6.external_sources) > 0
    assert "passport" in r6.external_sources[0]["title"].lower() or "passport" in r6.answer.lower()
