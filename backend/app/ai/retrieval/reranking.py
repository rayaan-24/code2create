from typing import List, Tuple
from app.ai.retrieval.hybrid_search import HybridSearchResult
from app.ai.schemas.response import SourceAttribution


class Reranker:
    """Reranks retrieved hybrid results and prepares deduplicated context chunks."""

    def __init__(self, top_k: int = 5):
        self.top_k = top_k

    def rerank_and_format(
        self,
        results: List[HybridSearchResult],
    ) -> Tuple[str, List[SourceAttribution]]:
        """
        Rerank top candidates, build prompt context string, and construct source attributions.
        """
        selected = results[: self.top_k]
        if not selected:
            return "No verified community documents found for this query.", []

        context_blocks: List[str] = []
        sources: List[SourceAttribution] = []
        seen_sources = set()

        for idx, item in enumerate(selected, 1):
            chunk = item.chunk
            meta = chunk.metadata_dict
            doc_title = meta.get("document_title") or (chunk.document.title if chunk.document else "Official Community Record")
            section_title = chunk.section or "General"
            page_info = f"Page {chunk.page_number}" if chunk.page_number else "Section " + section_title

            block = (
                f"[Source {idx}: {doc_title} | {page_info} | Status: {chunk.verification_status}]\n"
                f"{chunk.content.strip()}"
            )
            context_blocks.append(block)

            # Build source attribution for UI card
            source_key = f"{doc_title}_{page_info}"
            if source_key not in seen_sources:
                seen_sources.add(source_key)
                sources.append(
                    SourceAttribution(
                        source_id=chunk.id,
                        title=doc_title,
                        source_document=doc_title,
                        page_or_section=page_info,
                        confidence_score=round(min(1.0, item.final_score), 2),
                        verified=chunk.verification_status == "VERIFIED",
                        verified_at=chunk.created_at.strftime("%Y-%m-%d") if chunk.created_at else None,
                    )
                )

        formatted_context = "\n\n---\n\n".join(context_blocks)
        return formatted_context, sources
