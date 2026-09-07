import time
import logging
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.community import Community
from app.ai.llm_client import llm_client
from app.ai.prompts.system import NEXORA_BASE_SYSTEM_PROMPT
from app.ai.prompts.intent import INTENT_CLASSIFICATION_PROMPT
from app.ai.prompts.answer import RAG_ANSWER_PROMPT
from app.ai.context.state import ConversationState
from app.ai.context.memory import ConversationMemory
from app.ai.context.manager import ContextManager
from app.ai.context.grounding_context import GroundingContextBuilder
from app.ai.retrieval.hybrid_search import HybridRetriever
from app.ai.retrieval.reranking import Reranker
from app.ai.tools.registry import ToolRegistry
from app.ai.safety.prompt_injection import PromptInjectionDetector
from app.ai.safety.validation import rate_limiter, validate_input_length
from app.ai.safety.grounding import GroundingValidator, UNVERIFIED_STANDARD_REFUSAL
from app.ai.schemas.intent import IntentClassificationResult, IntentType
from app.ai.schemas.response import AIResponse, ActionItem, ActionType, SourceAttribution

logger = logging.getLogger("nexora.ai.orchestrator")


class AIOrchestrator:
    """
    Primary AI Orchestration service coordinating Context, Intent, Hybrid RAG,
    Tool Execution, SGLang Inference, and Grounding Validation.
    """

    def __init__(self):
        self.context_mgr = ContextManager(max_history_turns=8)
        self.retriever = HybridRetriever(
            vector_weight=0.6,
            keyword_weight=0.4,
            verification_bonus=0.25,
        )
        self.reranker = Reranker(top_k=settings.RERANK_TOP_K)

    async def process_chat(
        self,
        db: Session,
        current_user: User,
        community: Community,
        raw_message: str,
        conversation_id: Optional[str] = None,
        debug_mode: bool = False,
    ) -> AIResponse:
        """Execute full end-to-end AI reasoning cycle."""
        start_time = time.time()
        debug_info: Dict[str, Any] = {}

        # 1. Rate Limiting Check
        allowed, remaining = rate_limiter.is_allowed(current_user.id)
        if not allowed:
            return AIResponse(
                answer="Rate limit exceeded. Please wait a moment before sending another request.",
                intent="RATE_LIMITED",
            )

        # 2. Input Validation & Prompt Injection Detection
        sanitized_input = validate_input_length(raw_message.strip())
        is_injection, injection_reason = PromptInjectionDetector.inspect(sanitized_input)

        if is_injection:
            logger.warning(f"Neutralized injection attempt by user {current_user.id}: {injection_reason}")
            return AIResponse(
                answer=(
                    "I cannot fulfill requests that attempt to bypass community safety guidelines, "
                    "override system instructions, or access unauthorized administrative data."
                ),
                intent="SECURITY_BLOCKED",
            )

        # 3. Conversation Session & State Management
        session, state = self.context_mgr.get_or_create_session(
            db=db,
            session_id=conversation_id,
            user_id=current_user.id,
            community_id=community.id,
        )

        # 4. Context Memory Reference Resolution (pronoun & location tracking)
        resolved_query, updated_state = ConversationMemory.resolve_references(
            query=sanitized_input,
            state=state,
        )

        # 5. Intent Classification & Entity Extraction
        intent_prompt = INTENT_CLASSIFICATION_PROMPT.format(
            conversation_state=updated_state.model_dump_json(),
            user_message=resolved_query,
        )
        intent_result: IntentClassificationResult = await llm_client.generate_structured(
            prompt=intent_prompt,
            schema=IntentClassificationResult,
        )

        intent = intent_result.intent.value if hasattr(intent_result.intent, "value") else str(intent_result.intent)
        entities = intent_result.entities.model_dump(exclude_none=True)

        if debug_mode:
            debug_info["resolved_query"] = resolved_query
            debug_info["intent"] = intent
            debug_info["entities"] = entities
            debug_info["current_location"] = updated_state.current_location
            debug_info["current_destination"] = updated_state.current_destination

        # 6. Hybrid RAG Retrieval (Knowledge Chunks)
        retrieved_context = "No community documents retrieved."
        sources: List[SourceAttribution] = []

        if intent_result.needs_retrieval or intent in ["QUESTION", "PROCEDURE", "LOCATION", "SERVICE_LOOKUP"]:
            hybrid_results = self.retriever.search(
                db=db,
                community_id=community.id,
                query=resolved_query,
                top_k=settings.RERANK_TOP_K,
                min_score=settings.RAG_MIN_RELEVANCE_SCORE,
            )
            if hybrid_results:
                retrieved_context, sources = GroundingContextBuilder.build_grounded_context(
                    retrieved_results=hybrid_results,
                    max_chunks=settings.MAX_CONTEXT_CHUNKS,
                    max_tokens=settings.MAX_CONTEXT_TOKENS,
                )
            else:
                retrieved_context = "No verified community documents found for this query."
                sources = []

            if debug_mode:
                debug_info["retrieval_chunks_count"] = len(hybrid_results)
                debug_info["top_sources"] = [s.title for s in sources]

        # 7. AI Tool Execution
        tool_registry = ToolRegistry(max_tool_calls=settings.MAX_TOOL_CALLS)
        tool_results_data: List[Dict[str, Any]] = []
        structured_card: Optional[Dict[str, Any]] = None
        actions: List[ActionItem] = []
        executed_tool_name: Optional[str] = None
        executed_tool_result: Optional[Dict[str, Any]] = None

        # Determine tool from intent
        if intent == "PROCEDURE":
            executed_tool_name = "get_procedure"
            target_p = entities.get("procedure") or resolved_query
            res = tool_registry.execute_tool(
                "get_procedure", {"procedure_title": target_p}, db, community.id, current_user.role
            )
            if res.status == "success" and res.data:
                executed_tool_result = res.data
                tool_results_data.append({"tool": "get_procedure", "result": res.data})
                structured_card = {"type": "procedure", "procedure": res.data}
                # Offer navigation action
                actions.append(
                    ActionItem(
                        type=ActionType.NAVIGATE,
                        label=f"Navigate to {res.data.get('responsibleOffice', 'Office')}",
                        payload={"destination": res.data.get("responsibleOffice"), "room": "G12"},
                    )
                )

        elif intent == "LOCATION":
            executed_tool_name = "get_location"
            target_l = entities.get("location") or updated_state.current_destination or resolved_query
            res = tool_registry.execute_tool(
                "get_location", {"query": target_l}, db, community.id, current_user.role
            )
            if res.status == "success" and res.data:
                executed_tool_result = res.data
                tool_results_data.append({"tool": "get_location", "result": res.data})
                structured_card = {"type": "location", "location": res.data}
                actions.append(
                    ActionItem(
                        type=ActionType.NAVIGATE,
                        label=f"Get Directions to {res.data.get('name')}",
                        payload={"destination": res.data.get("name"), "room": res.data.get("room")},
                    )
                )

        elif intent == "NAVIGATION":
            executed_tool_name = "calculate_route"
            start_loc = updated_state.current_location or "Library"
            dest_loc = updated_state.current_destination or "Student Services Center (SJT-G12)"
            res = tool_registry.execute_tool(
                "calculate_route",
                {"start_location": start_loc, "destination": dest_loc},
                db,
                community.id,
                current_user.role,
            )
            if res.status == "success" and res.data:
                executed_tool_result = res.data
                tool_results_data.append({"tool": "calculate_route", "result": res.data})
                structured_card = {"type": "navigation", "navigationRoute": res.data}

        elif intent == "PERSON_LOOKUP":
            executed_tool_name = "get_person"
            target_person = entities.get("person_name") or resolved_query
            res = tool_registry.execute_tool(
                "get_person", {"name_or_role": target_person}, db, community.id, current_user.role
            )
            if res.status == "success" and res.data:
                executed_tool_result = res.data
                tool_results_data.append({"tool": "get_person", "result": res.data})
                structured_card = {"type": "person", "person": res.data}

        elif intent == "SERVICE_LOOKUP":
            executed_tool_name = "get_service"
            target_s = entities.get("service") or resolved_query
            res = tool_registry.execute_tool(
                "get_service", {"service_name": target_s}, db, community.id, current_user.role
            )
            if res.status == "success" and res.data:
                executed_tool_result = res.data
                tool_results_data.append({"tool": "get_service", "result": res.data})
                structured_card = {"type": "service", "service": res.data}

        external_sources: List[Dict[str, Any]] = []
        is_external_query = (intent == "EXTERNAL_INFORMATION" or any(k in resolved_query.lower() for k in ["passport", "prime minister", "visa", "external"]))
        if is_external_query:
            intent = "EXTERNAL_INFORMATION"
            executed_tool_name = "search_web"
            res = tool_registry.execute_tool(
                "search_web", {"query": resolved_query}, db, community.id, current_user.role
            )
            if res.status == "success" and res.data:
                executed_tool_result = res.data
                tool_results_data.append({"tool": "search_web", "result": res.data})
                for item in res.data.get("results", [])[:3]:
                    external_sources.append(item)
                    actions.append(
                        ActionItem(
                            type=ActionType.OPEN_WEB_SOURCE,
                            label=f"External: {item.get('source', 'Official Web')}",
                            payload={"url": item.get("url", "#"), "title": item.get("title", "")},
                        )
                    )

        # 8. Grounded LLM Answer Generation
        # If community question has zero verified evidence, immediately return refusal fallback
        if (intent == "QUESTION" or (intent_result.needs_retrieval and not executed_tool_name)) and not sources and not is_external_query:
            raw_answer = UNVERIFIED_STANDARD_REFUSAL
        else:
            history_context = self.context_mgr.get_formatted_history(session)
            system_prompt = NEXORA_BASE_SYSTEM_PROMPT.format(
                community_name=community.name,
                community_id=community.id,
                user_name=current_user.name,
                user_role=current_user.role,
                user_department=current_user.department or "General Community",
                preferred_language="English",
            )

            answer_prompt = RAG_ANSWER_PROMPT.format(
                user_query=sanitized_input,
                conversation_context=history_context,
                retrieved_knowledge=retrieved_context,
                tool_results=str(tool_results_data) if tool_results_data else "No specific tool results.",
            )

            raw_answer = await llm_client.generate(
                prompt=answer_prompt,
                system_prompt=system_prompt,
                max_tokens=settings.SGLANG_MAX_TOKENS,
                temperature=settings.SGLANG_TEMPERATURE,
            )

        # 9. Grounding & Hallucination Guard
        final_answer = GroundingValidator.enforce_grounding(
            query=sanitized_input,
            answer=raw_answer,
            retrieved_chunks=sources,
            tool_results=tool_results_data,
            needs_retrieval=(intent in ["QUESTION", "PROCEDURE", "LOCATION", "SERVICE_LOOKUP", "PERSON_LOOKUP"]),
            is_external=is_external_query,
        )

        # 10. Update Conversation Memory & Persist Turn
        final_state = ConversationMemory.update_state_after_turn(
            state=updated_state,
            intent=intent,
            entities=entities,
            tool_name=executed_tool_name,
            tool_result=executed_tool_result,
            sources=sources,
        )

        response_obj = AIResponse(
            answer=final_answer,
            intent=intent,
            actions=actions,
            sources=sources,
            external_sources=external_sources,
            tools_used=[executed_tool_name] if executed_tool_name else [],
            is_external=is_external_query,
            structured_card=structured_card,
            requires_navigation=(intent == "NAVIGATION" or any(a.type == ActionType.NAVIGATE for a in actions)),
            grounded=True,
            retrieval_count=len(sources),
            debug_info=debug_info if debug_mode else None,
        )

        self.context_mgr.persist_turn(
            db=db,
            session=session,
            state=final_state,
            user_query=sanitized_input,
            assistant_response=response_obj,
        )

        duration = round((time.time() - start_time) * 1000, 2)
        logger.info(f"AI Orchestrator finished turn for user {current_user.id} in {duration}ms (Intent: {intent})")

        return response_obj


# Global orchestrator singleton
orchestrator = AIOrchestrator()
