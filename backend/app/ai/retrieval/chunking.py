import re
from typing import List, Dict, Any, Optional
from app.ai.retrieval.ingestion import ParsedPage


class TextChunk:
    def __init__(
        self,
        content: str,
        page_number: Optional[int],
        section: Optional[str],
        chunk_index: int,
        token_count: int,
        metadata: Dict[str, Any],
    ):
        self.content = content
        self.page_number = page_number
        self.section = section
        self.chunk_index = chunk_index
        self.token_count = token_count
        self.metadata = metadata


class SemanticChunker:
    """
    Splits document pages into semantic chunks respecting paragraphs, lists,
    headings, and sentence boundaries.
    """

    def __init__(self, target_chunk_chars: int = 600, overlap_chars: int = 100):
        self.target_chunk_chars = target_chunk_chars
        self.overlap_chars = overlap_chars

    def chunk_pages(
        self,
        pages: List[ParsedPage],
        document_id: Optional[str] = None,
        community_id: str = "",
        document_title: str = "",
        verification_status: str = "VERIFIED",
    ) -> List[TextChunk]:
        """Split a list of ParsedPage objects into clean chunks with attached metadata."""
        chunks: List[TextChunk] = []
        global_chunk_idx = 0

        for page in pages:
            # Split page into natural paragraphs
            paragraphs = [p.strip() for p in re.split(r"\n\s*\n", page.content) if p.strip()]

            current_buffer = ""
            for para in paragraphs:
                if len(current_buffer) + len(para) <= self.target_chunk_chars:
                    current_buffer += ("\n\n" if current_buffer else "") + para
                else:
                    if current_buffer:
                        chunks.append(
                            TextChunk(
                                content=current_buffer,
                                page_number=page.page_number,
                                section=page.section,
                                chunk_index=global_chunk_idx,
                                token_count=len(current_buffer.split()),
                                metadata={
                                    "document_id": document_id,
                                    "community_id": community_id,
                                    "document_title": document_title,
                                    "verification_status": verification_status,
                                },
                            )
                        )
                        global_chunk_idx += 1
                        # Retain overlap from end of current buffer
                        current_buffer = current_buffer[-self.overlap_chars :] + "\n\n" + para
                    else:
                        current_buffer = para

            if current_buffer.strip():
                chunks.append(
                    TextChunk(
                        content=current_buffer,
                        page_number=page.page_number,
                        section=page.section,
                        chunk_index=global_chunk_idx,
                        token_count=len(current_buffer.split()),
                        metadata={
                            "document_id": document_id,
                            "community_id": community_id,
                            "document_title": document_title,
                            "verification_status": verification_status,
                        },
                    )
                )
                global_chunk_idx += 1

        return chunks
