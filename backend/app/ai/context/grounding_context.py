import re
import logging
from typing import List, Tuple, Any, Optional
from app.core.config import settings
from app.ai.schemas.response import SourceAttribution
from app.ai.safety.prompt_injection import PromptInjectionDetector

logger = logging.getLogger(__name__)


class GroundingContextBuilder:
    """
    Constructs compact, prompt-injection defended context blocks for SGLang grounded generation,
    assigning stable source citations ([S1], [S2], ...) and structured metadata.
    """

    @classmethod
    def build_grounded_context(
        cls,
        retrieved_results: List[Any],
        max_chunks: Optional[int] = None,
        max_tokens: Optional[int] = None,
    ) -> Tuple[str, List[SourceAttribution]]:
        """
        Convert retrieved HybridSearchResult or ScoredChunk candidates into
        a delimited reference block and structured SourceAttribution models.
        """
        limit_chunks = max_chunks or settings.MAX_CONTEXT_CHUNKS
        char_budget = (max_tokens or settings.MAX_CONTEXT_TOKENS) * 4

        selected = retrieved_results[:limit_chunks]
        if not selected:
            return "No verified community documents found for this query.", []

        context_blocks: List[str] = []
        sources: List[SourceAttribution] = []
        current_chars = 0

        for idx, item in enumerate(selected, 1):
            citation_id = f"S{idx}"
            chunk = getattr(item, "chunk", item)

            # Metadata extraction
            meta = chunk.metadata_dict if hasattr(chunk, "metadata_dict") else {}
            doc = getattr(chunk, "document", None)
            doc_title = (
                meta.get("document_title")
                or (doc.title if doc else None)
                or "Official Community Document"
            )
            doc_version = meta.get("document_version") or (doc.version if doc else 1)
            section = chunk.section or "General"
            page_info = f"Page {chunk.page_number}" if chunk.page_number else f"Section: {section}"

            # Score extraction
            final_score = getattr(item, "final_score", getattr(item, "score", 1.0))
            retrieval_sources = getattr(item, "retrieval_sources", ["hybrid"])

            # Prompt Injection Defense: sanitize inner control tokens
            raw_content = chunk.content.strip()
            safe_content = PromptInjectionDetector.sanitize_user_input(raw_content)

            block = (
                f"[{citation_id}]\n"
                f"Document: {doc_title} (v{doc_version})\n"
                f"Location: {page_info}\n"
                f"Status: {chunk.verification_status}\n"
                f"Content:\n{safe_content}"
            )

            # Check character budget
            if current_chars + len(block) > char_budget and sources:
                logger.info(f"Context character budget reached at chunk {idx}, capping context.")
                break

            context_blocks.append(block)
            current_chars += len(block)

            created_date = (
                chunk.created_at.strftime("%Y-%m-%d")
                if hasattr(chunk, "created_at") and chunk.created_at
                else None
            )

            sources.append(
                SourceAttribution(
                    source_id=chunk.id,
                    title=doc_title,
                    source_document=doc_title,
                    page_or_section=page_info,
                    confidence_score=round(min(1.0, float(final_score)), 2),
                    verified=chunk.verification_status == "VERIFIED",
                    verified_at=created_date,
                    id=citation_id,
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    document_title=doc_title,
                    page_number=chunk.page_number,
                    section=chunk.section,
                    document_version=doc_version,
                    retrieval_sources=retrieval_sources,
                )
            )

        joined_blocks = "\n\n---\n\n".join(context_blocks)
        delimited_context = (
            "<retrieved_context>\n"
            f"{joined_blocks}\n"
            "</retrieved_context>"
        )

        return delimited_context, sources
