import pytest
from app.ai.context.state import ConversationState
from app.ai.context.memory import ConversationMemory


def test_pronoun_reference_resolution():
    state = ConversationState(
        community_id="comm_01",
        current_destination="Student Services Center",
        last_office="Student Services Center",
    )

    query = "Where is that office?"
    augmented_query, updated_state = ConversationMemory.resolve_references(query, state)
    assert "Student Services Center" in augmented_query


def test_location_update():
    state = ConversationState(
        community_id="comm_01",
        current_destination="Student Services Center",
    )

    query = "I'm near the library."
    augmented_query, updated_state = ConversationMemory.resolve_references(query, state)
    assert updated_state.current_location is not None
    assert "Library" in updated_state.current_location


def test_eta_followup_resolution():
    state = ConversationState(
        community_id="comm_01",
        current_location="Central Library",
        current_destination="Student Services Center",
    )

    query = "How long will it take?"
    augmented_query, updated_state = ConversationMemory.resolve_references(query, state)
    assert "route" in augmented_query.lower() or "from Central Library to Student Services Center" in augmented_query


def test_state_update_after_turn():
    initial_state = ConversationState(community_id="comm_01")
    updated = ConversationMemory.update_state_after_turn(
        state=initial_state,
        intent="PROCEDURE",
        entities={"procedure": "ID Card Replacement"},
        tool_name="get_procedure",
        tool_result={"responsibleOffice": "Student Services Center"},
    )
    assert updated.active_intent == "PROCEDURE"
    assert updated.last_procedure == "ID Card Replacement"
    assert updated.current_destination == "Student Services Center"
