import time
import logging
import re
import uuid
import asyncio
from typing import Optional, Dict, Any, List, Tuple
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.user import User
from app.models.community import Community
from app.ai.llm_client import llm_client
from app.ai.prompts.system import NEXORA_BASE_SYSTEM_PROMPT
from app.ai.prompts.intent import INTENT_CLASSIFICATION_PROMPT
from app.ai.prompts.answer import (
    RAG_ANSWER_PROMPT,
    GROUNDED_RAG_PROMPT,
    GENERAL_AI_PROMPT,
    WEB_SEARCH_SYNTHESIS_PROMPT,
    MULTI_TOOL_PROMPT,
)
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

    def _quick_intent_check(self, query: str) -> Optional[Tuple[IntentClassificationResult, Optional[str]]]:
        """
        Rule-based fast intent matching for basic greetings and simple queries
        to avoid an extra LLM call for intent classification.
        Returns (IntentClassificationResult, direct_answer_if_short_circuit).
        """
        clean = query.strip().lower()
        clean_nopunct = re.sub(r"[^\w\s]", "", clean).strip()

        # 1. Greetings & Pleasantries short-circuit
        greetings = {"hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greetings", "howdy"}
        thanks = {"thanks", "thank you", "thanks a lot", "thank you so much", "thx"}
        identity = {"who are you", "what is your name", "what are you", "who made you"}

        if clean_nopunct in greetings or any(clean_nopunct == g for g in greetings):
            result = IntentClassificationResult(
                intent=IntentType.GENERAL_CHAT,
                confidence=1.0,
                needs_retrieval=False,
                needs_tool=False,
            )
            answer = "Hello! I'm NEXORA, your community AI assistant. How can I help you today?"
            return result, answer

        if clean_nopunct in thanks or any(clean_nopunct == t for t in thanks):
            result = IntentClassificationResult(
                intent=IntentType.GENERAL_CHAT,
                confidence=1.0,
                needs_retrieval=False,
                needs_tool=False,
            )
            answer = "You're welcome! Let me know if you need help with anything else."
            return result, answer

        if clean_nopunct in identity:
            result = IntentClassificationResult(
                intent=IntentType.GENERAL_CHAT,
                confidence=1.0,
                needs_retrieval=False,
                needs_tool=False,
            )
            answer = "I am NEXORA, an intelligent community AI assistant designed to help with campus navigation, procedures, services, and general inquiries."
            return result, answer

        # 2. Basic general knowledge/coding queries short-circuit
        if clean_nopunct in {"what is python", "what is python language", "tell me about python"}:
            result = IntentClassificationResult(
                intent=IntentType.CODING,
                confidence=1.0,
                needs_retrieval=False,
                needs_tool=False,
            )
            answer = "Python is a high-level, interpreted programming language known for readability, clear syntax, and wide ecosystem support across web development, data science, AI, and automation."
            return result, answer

        # 3. Simple General Chat detection without direct short-circuit answer
        if any(clean_nopunct.startswith(g) for g in ["hello ", "hi ", "hey "]):
            result = IntentClassificationResult(
                intent=IntentType.GENERAL_CHAT,
                confidence=0.95,
                needs_retrieval=False,
                needs_tool=False,
            )
            return result, None

        return None

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
        correlation_id = f"NEXORA-CHAT-{uuid.uuid4().hex[:8]}"
        debug_info: Dict[str, Any] = {}
        logger.info(f"[{correlation_id}] REQUEST RECEIVED: '{raw_message.strip()[:60]}' (user={current_user.id})")

        # 1. Rate Limiting Check
        allowed, remaining = rate_limiter.is_allowed(current_user.id)
        if not allowed:
            logger.warning(f"[{correlation_id}] RATE LIMIT HIT for user {current_user.id}")
            return AIResponse(
                answer="Rate limit exceeded. Please wait a moment before sending another request.",
                intent="RATE_LIMITED",
            )

        # 2. Input Validation & Prompt Injection Detection
        sanitized_input = validate_input_length(raw_message.strip())
        is_injection, injection_reason = PromptInjectionDetector.inspect(sanitized_input)

        if is_injection:
            logger.warning(f"[{correlation_id}] Neutralized injection attempt by user {current_user.id}: {injection_reason}")
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
        logger.info(f"[{correlation_id}] AUTH & SESSION RESOLVED: session_id={session.id}")

        # 4. Context Memory Reference Resolution (pronoun & location tracking)
        resolved_query, updated_state = ConversationMemory.resolve_references(
            query=sanitized_input,
            state=state,
        )

        # 5. Fast Intent Matching & Short-Circuit Check
        t_routing_start = time.time()
        quick_match = self._quick_intent_check(resolved_query)

        if quick_match:
            intent_result, direct_answer = quick_match
            intent = intent_result.intent.value if hasattr(intent_result.intent, "value") else str(intent_result.intent)
            entities = {}
            t_routing_ms = round((time.time() - t_routing_start) * 1000, 2)

            if direct_answer:
                # Immediate short-circuit: skip RAG, tools, ElevenLabs, and LLM calls entirely
                response_obj = AIResponse(
                    answer=direct_answer,
                    intent=intent,
                    actions=[],
                    sources=[],
                    external_sources=[],
                    tools_used=[],
                    is_external=False,
                    grounded=True,
                    retrieval_count=0,
                )
                try:
                    self.context_mgr.persist_turn(
                        db=db,
                        session=session,
                        state=updated_state,
                        user_query=sanitized_input,
                        assistant_response=response_obj,
                    )
                except Exception as db_err:
                    logger.warning(f"[{correlation_id}] Non-critical DB persist turn error: {db_err}")

                t_total_ms = round((time.time() - start_time) * 1000, 2)
                logger.info(
                    f"[{correlation_id}] received: 0ms | routing: {t_routing_ms}ms | rag: skipped | tools: skipped | llm: skipped | total: {t_total_ms}ms"
                )
                return response_obj
        else:
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
            t_routing_ms = round((time.time() - t_routing_start) * 1000, 2)

        logger.info(f"[{correlation_id}] INTENT DETECTED: {intent} (needs_retrieval={intent_result.needs_retrieval})")

        if debug_mode:
            debug_info["resolved_query"] = resolved_query
            debug_info["intent"] = intent
            debug_info["entities"] = entities
            debug_info["current_location"] = updated_state.current_location
            debug_info["current_destination"] = updated_state.current_destination

        # 6. Selective Hybrid RAG Retrieval with Timeout (Max 10s)
        retrieved_context = "No community documents retrieved."
        sources: List[SourceAttribution] = []

        is_community_intent = intent in [
            "ORGANIZATION_KNOWLEDGE", "QUESTION", "PROCEDURE",
            "LOCATION", "SERVICE_LOOKUP", "MULTI_TOOL",
            "ANNOUNCEMENT", "REQUEST", "UNKNOWN", "EDUCATION", "GENERAL_KNOWLEDGE"
        ] or intent_result.needs_retrieval

        t_rag_ms: Any = "skipped"
        if intent_result.needs_retrieval and is_community_intent:
            t_rag_start = time.time()
            logger.info(f"[{correlation_id}] RAG START: query='{resolved_query[:50]}' (community={community.id})")
            try:
                def _run_search():
                    return self.retriever.search(
                        db=db,
                        community_id=community.id,
                        query=resolved_query,
                        top_k=settings.RERANK_TOP_K,
                        min_score=settings.RAG_MIN_RELEVANCE_SCORE,
                    )
                hybrid_results = await asyncio.wait_for(asyncio.to_thread(_run_search), timeout=10.0)
                if hybrid_results:
                    retrieved_context, sources = GroundingContextBuilder.build_grounded_context(
                        retrieved_results=hybrid_results,
                        max_chunks=settings.MAX_CONTEXT_CHUNKS,
                        max_tokens=settings.MAX_CONTEXT_TOKENS,
                    )
                else:
                    retrieved_context = "No verified community documents found for this query."
                    sources = []
            except asyncio.TimeoutError:
                logger.warning(f"[{correlation_id}] RAG retrieval timed out after 10s. Continuing with general LLM response.")
                retrieved_context = "No community documents retrieved."
                sources = []
            except Exception as rag_err:
                logger.warning(f"[{correlation_id}] RAG retrieval error ({rag_err}). Continuing with general LLM response.")
                retrieved_context = "No community documents retrieved."
                sources = []

            t_rag_ms = round((time.time() - t_rag_start) * 1000, 2)
            logger.info(f"[{correlation_id}] RAG COMPLETE: {len(sources)} chunks retrieved (duration={t_rag_ms}ms)")

            if debug_mode:
                debug_info["retrieval_chunks_count"] = len(sources)
                debug_info["top_sources"] = [s.title for s in sources]

        # 7. AI Tool Execution with Try-Except & Timeouts
        t_tools_start = time.time()
        tool_registry = ToolRegistry(max_tool_calls=settings.MAX_TOOL_CALLS)
        tool_results_data: List[Dict[str, Any]] = []
        structured_card: Optional[Dict[str, Any]] = None
        actions: List[ActionItem] = []
        executed_tool_name: Optional[str] = None
        executed_tool_result: Optional[Dict[str, Any]] = None

        try:
            # A. Multi-Tool Execution
            if intent == "MULTI_TOOL":
                target_loc = entities.get("location") or ("Library" if "library" in resolved_query.lower() else "Student Services")
                loc_res = tool_registry.execute_tool(
                    "get_location", {"query": target_loc}, db, community.id, current_user.role
                )
                if loc_res.status == "success" and loc_res.data:
                    tool_results_data.append({"tool": "get_location", "result": loc_res.data})
                    structured_card = {"type": "location", "location": loc_res.data}
                    executed_tool_name = "get_location"

                start_loc = updated_state.current_location or "Library"
                dest_loc = target_loc
                route_res = tool_registry.execute_tool(
                    "calculate_route",
                    {"start_location": start_loc, "destination": dest_loc},
                    db,
                    community.id,
                    current_user.role,
                )
                if route_res.status == "success" and route_res.data:
                    tool_results_data.append({"tool": "calculate_route", "result": route_res.data})
                    if not structured_card:
                        structured_card = {"type": "navigation", "navigationRoute": route_res.data}
                    actions.append(
                        ActionItem(
                            type=ActionType.NAVIGATE,
                            label=f"Get Directions to {target_loc}",
                            payload={"destination": target_loc, "route": route_res.data},
                        )
                    )

            # B. Procedure Execution
            elif intent == "PROCEDURE":
                executed_tool_name = "get_procedure"
                target_p = entities.get("procedure") or resolved_query
                res = tool_registry.execute_tool(
                    "get_procedure", {"procedure_title": target_p}, db, community.id, current_user.role
                )
                if res.status == "success" and res.data:
                    executed_tool_result = res.data
                    tool_results_data.append({"tool": "get_procedure", "result": res.data})
                    structured_card = {"type": "procedure", "procedure": res.data}
                    actions.append(
                        ActionItem(
                            type=ActionType.NAVIGATE,
                            label=f"Navigate to {res.data.get('responsibleOffice', 'Office')}",
                            payload={"destination": res.data.get("responsibleOffice"), "room": "G12"},
                        )
                    )

            # C. Location Execution
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
                            payload={"destination": res.data.get('name'), "room": res.data.get('room')},
                        )
                    )

            # D. Navigation Execution
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

            # E. Person Lookup
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

            # F. Service Lookup
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
        except Exception as tool_err:
            logger.warning(f"[{correlation_id}] Internal tool execution error ({tool_err}). Continuing.")

        # G. Web Search Execution with 10s strict timeout
        external_sources: List[Dict[str, Any]] = []
        is_external_query = (
            intent in ["WEB_SEARCH", "EXTERNAL_INFORMATION"] or
            any(k in resolved_query.lower() for k in [
                "latest", "today", "current", "recent", "yesterday", "this week",
                "weather", "live", "ceo of", "prime minister", "president",
                "price", "ranking", "who won", "score", "match", "passport", "visa"
            ])
        )
        if is_external_query and intent != "LOCATION":
            intent = "EXTERNAL_INFORMATION"
            executed_tool_name = "search_web"
            logger.info(f"[{correlation_id}] WEB SEARCH START: query='{resolved_query[:50]}'")
            try:
                def _run_web():
                    return tool_registry.execute_tool(
                        "search_web", {"query": resolved_query}, db, community.id, current_user.role
                    )
                res = await asyncio.wait_for(asyncio.to_thread(_run_web), timeout=10.0)
                if res and res.status == "success" and res.data:
                    executed_tool_result = res.data
                    tool_results_data.append({"tool": "search_web", "result": res.data})
                    for item in res.data.get("results", [])[:3]:
                        external_sources.append(item)
                        actions.append(
                            ActionItem(
                                type=ActionType.OPEN_WEB_SOURCE,
                                label=f"Source: {item.get('source', 'Web')}",
                                payload={"url": item.get("url", "#"), "title": item.get("title", "")},
                            )
                        )
            except asyncio.TimeoutError:
                logger.warning(f"[{correlation_id}] SerpApi web search timed out after 10s. Continuing.")
            except Exception as search_err:
                logger.warning(f"[{correlation_id}] Web search tool error ({search_err}). Continuing.")

        t_tools_ms = round((time.time() - t_tools_start) * 1000, 2)
        logger.info(f"[{correlation_id}] TOOL SELECTION COMPLETE: executed={[t['tool'] for t in tool_results_data]} (duration={t_tools_ms}ms)")

        # 8. Intelligent Hybrid Answer Generation via LLM
        t_llm_start = time.time()
        history_context = self.context_mgr.get_formatted_history(session)
        logger.info(f"[{correlation_id}] LLM START: model={settings.effective_llm_model} intent={intent}")
        system_prompt = NEXORA_BASE_SYSTEM_PROMPT.format(
            community_name=community.name,
            community_id=community.id,
            user_name=current_user.name,
            user_role=current_user.role,
            user_department=current_user.department or "General Community",
            preferred_language="English",
        )

        try:
            if sources:
                answer_prompt = GROUNDED_RAG_PROMPT.format(
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
            elif intent in ["GENERAL_KNOWLEDGE", "CODING", "EDUCATION", "CREATIVE", "GENERAL_CHAT"]:
                answer_prompt = GENERAL_AI_PROMPT.format(
                    user_query=sanitized_input,
                    conversation_context=history_context,
                )
                raw_answer = await llm_client.generate(
                    prompt=answer_prompt,
                    system_prompt=system_prompt,
                    max_tokens=settings.SGLANG_MAX_TOKENS,
                    temperature=0.3,
                )

            elif intent in ["WEB_SEARCH", "EXTERNAL_INFORMATION"]:
                search_data_str = ""
                for r in external_sources:
                    search_data_str += f"- {r.get('title')}: {r.get('snippet')} (Source: {r.get('source')})\n"
                if not search_data_str:
                    search_data_str = str(tool_results_data) if tool_results_data else "Web search completed with general results."

                answer_prompt = WEB_SEARCH_SYNTHESIS_PROMPT.format(
                    user_query=sanitized_input,
                    conversation_context=history_context,
                    search_results=search_data_str,
                )
                raw_answer = await llm_client.generate(
                    prompt=answer_prompt,
                    system_prompt=system_prompt,
                    max_tokens=settings.SGLANG_MAX_TOKENS,
                    temperature=0.2,
                )

            elif intent == "MULTI_TOOL":
                answer_prompt = MULTI_TOOL_PROMPT.format(
                    user_query=sanitized_input,
                    conversation_context=history_context,
                    retrieved_knowledge=retrieved_context,
                    tool_results=str(tool_results_data),
                )
                raw_answer = await llm_client.generate(
                    prompt=answer_prompt,
                    system_prompt=system_prompt,
                    max_tokens=settings.SGLANG_MAX_TOKENS,
                    temperature=0.2,
                )

            else:
                if not sources and not tool_results_data:
                    raw_answer = UNVERIFIED_STANDARD_REFUSAL
                else:
                    answer_prompt = GROUNDED_RAG_PROMPT.format(
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
        except Exception as llm_err:
            logger.warning(f"[{correlation_id}] LLM generation error ({llm_err}). Triggering local fallback.")
            raw_answer = llm_client._local_fallback_generate(sanitized_input, system_prompt)

        t_llm_ms = round((time.time() - t_llm_start) * 1000, 2)
        logger.info(f"[{correlation_id}] LLM COMPLETE: generated {len(raw_answer)} chars (duration={t_llm_ms}ms)")

        # 9. Grounding & Hallucination Guard
        final_answer = GroundingValidator.enforce_grounding(
            query=sanitized_input,
            answer=raw_answer,
            retrieved_chunks=sources,
            tool_results=tool_results_data,
            needs_retrieval=intent_result.needs_retrieval and is_community_intent,
            is_external=is_external_query,
            intent=intent,
        )
        try:
            final_answer = re.sub(r"\[Source[: ]+S(\d+)\]", r"[S\1]", final_answer)
        except Exception:
            pass

        # 10. Update Conversation Memory & Persist Turn safely
        final_state = ConversationMemory.update_state_after_turn(
            state=updated_state,
            intent=intent,
            entities=entities,
            tool_name=executed_tool_name,
            tool_result=executed_tool_result,
            sources=sources,
        )

        tools_used_list = [t["tool"] for t in tool_results_data]
        if sources:
            tools_used_list.append("rag")

        response_obj = AIResponse(
            answer=final_answer,
            intent=intent,
            actions=actions,
            sources=sources,
            external_sources=external_sources,
            tools_used=tools_used_list,
            is_external=is_external_query,
            structured_card=structured_card,
            requires_navigation=(intent in ["NAVIGATION", "MULTI_TOOL"] or any(a.type == ActionType.NAVIGATE for a in actions)),
            grounded=True,
            retrieval_count=len(sources),
            debug_info=debug_info if debug_mode else None,
        )

        try:
            self.context_mgr.persist_turn(
                db=db,
                session=session,
                state=final_state,
                user_query=sanitized_input,
                assistant_response=response_obj,
            )
        except Exception as db_persist_err:
            logger.warning(f"[{correlation_id}] Non-critical DB turn persistence notice: {db_persist_err}")

        total_duration = round((time.time() - start_time) * 1000, 2)

        # Step timing log output format:
        # [CHAT correlation_id] received: 0ms | routing: 5ms | rag: 12ms | tools: 3ms | llm: 650ms | total: 670ms
        logger.info(
            f"[{correlation_id}] received: 0ms | routing: {t_routing_ms}ms | rag: {t_rag_ms}ms | tools: {t_tools_ms}ms | llm: {t_llm_ms}ms | total: {total_duration}ms"
        )

        return response_obj


# Global orchestrator singleton
orchestrator = AIOrchestrator()
