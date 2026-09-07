import json
import os
import uuid
from typing import Optional, List
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.document import Document, DocumentVersion
from app.models.chunk import KnowledgeChunk
from app.models.procedure import VerificationStatus
from app.schemas.document import DocumentIngestionResponse
from app.ai.retrieval.ingestion import DocumentParser, ParsedPage
from app.ai.retrieval.chunking import SemanticChunker, TextChunk
from app.ai.retrieval.embeddings import embedding_provider
from app.services.storage_service import storage_service, DocumentStorageService


class DocumentIngestionService:
    """
    Orchestrates the end-to-end document ingestion pipeline:
    Validate -> Store Original -> Extract & Clean Text -> Chunk -> Attach Metadata & Embed -> Store Chunks in PostgreSQL
    """

    def __init__(
        self,
        storage: DocumentStorageService = storage_service,
        chunker: Optional[SemanticChunker] = None,
    ):
        self.storage = storage
        self.chunker = chunker or SemanticChunker(target_chunk_chars=600, overlap_chars=100)

    def ingest_document(
        self,
        db: Session,
        community_id: str,
        file_name: str,
        file_bytes: bytes,
        user_id: Optional[str] = None,
        title: Optional[str] = None,
        description: Optional[str] = None,
        auto_verify: bool = True,
    ) -> DocumentIngestionResponse:
        """
        Execute the full ingestion pipeline for an uploaded file.
        """
        # Step 1: Validate file format, size limits, and magic bytes
        try:
            ext = DocumentParser.validate_file_content(
                file_bytes=file_bytes,
                file_name=file_name,
                max_size_bytes=settings.MAX_UPLOAD_SIZE_BYTES,
            )
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "INVALID_DOCUMENT", "message": str(e)},
            )

        document_id = str(uuid.uuid4())
        doc_title = title.strip() if title and title.strip() else os.path.splitext(file_name)[0].replace("_", " ").title()

        # Step 2: Store original document to persistent local storage
        try:
            storage_key, checksum = self.storage.save_file(
                community_id=community_id,
                document_id=document_id,
                file_name=file_name,
                file_bytes=file_bytes,
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "STORAGE_FAILED", "message": f"Failed to persist document file: {e}"},
            )

        # Step 3: Extract and clean text from document
        try:
            parsed_pages: List[ParsedPage] = DocumentParser.parse_file(file_bytes, file_name)
        except Exception as e:
            # Clean up stored file if parsing fails
            self.storage.delete_file(storage_key)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "PARSING_FAILED", "message": f"Failed to parse document content: {e}"},
            )

        if not parsed_pages or all(not p.content.strip() for p in parsed_pages):
            self.storage.delete_file(storage_key)
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"code": "EMPTY_EXTRACTED_CONTENT", "message": f"Document '{file_name}' contains no readable text."},
            )

        # Step 4: Create Document & DocumentVersion database records
        verification_enum = VerificationStatus.VERIFIED if auto_verify else VerificationStatus.PENDING

        try:
            doc = Document(
                id=document_id,
                community_id=community_id,
                title=doc_title,
                description=description,
                file_name=file_name,
                file_type=ext.lstrip("."),
                storage_key=storage_key,
                version=1,
                uploaded_by=user_id,
                verification_status=verification_enum,
                is_active=True,
            )
            db.add(doc)

            doc_version = DocumentVersion(
                document_id=doc.id,
                version_number=1,
                file_name=file_name,
                storage_key=storage_key,
                uploaded_by=user_id,
                change_summary="Initial document ingestion",
            )
            db.add(doc_version)

            # Step 5: Split into semantic chunks
            status_str = verification_enum.value if hasattr(verification_enum, "value") else str(verification_enum)
            raw_chunks: List[TextChunk] = self.chunker.chunk_pages(
                pages=parsed_pages,
                document_id=doc.id,
                community_id=community_id,
                document_title=doc_title,
                verification_status=status_str,
            )

            # Step 6: Attach metadata, generate 384-dim neural embeddings (batched) & prepare KnowledgeChunk records
            chunk_texts = [c.content for c in raw_chunks]
            embedding_vectors = embedding_provider.embed_documents(chunk_texts)

            knowledge_chunks: List[KnowledgeChunk] = []
            for chunk, embedding_vector in zip(raw_chunks, embedding_vectors):
                chunk_metadata = {
                    **chunk.metadata,
                    "file_name": file_name,
                    "checksum": checksum,
                    "storage_key": storage_key,
                    "file_type": ext.lstrip("."),
                }

                db_chunk = KnowledgeChunk(
                    id=str(uuid.uuid4()),
                    document_id=doc.id,
                    community_id=community_id,
                    content=chunk.content,
                    embedding=embedding_vector,
                    embedding_json=json.dumps(embedding_vector),
                    page_number=chunk.page_number,
                    section=chunk.section,
                    chunk_index=chunk.chunk_index,
                    token_count=chunk.token_count,
                    verification_status=status_str,
                    metadata_json=json.dumps(chunk_metadata),
                )
                knowledge_chunks.append(db_chunk)

            # Step 7: Store chunks in database
            db.add_all(knowledge_chunks)
            db.commit()
            db.refresh(doc)

        except Exception as e:
            db.rollback()
            self.storage.delete_file(storage_key)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail={"code": "DATABASE_ERROR", "message": f"Failed to store document and chunks in database: {e}"},
            )

        return DocumentIngestionResponse(
            document_id=doc.id,
            title=doc.title,
            file_name=doc.file_name,
            file_size_bytes=len(file_bytes),
            storage_key=storage_key,
            file_checksum=checksum,
            pages_parsed=len(parsed_pages),
            chunks_created=len(knowledge_chunks),
            verification_status=status_str,
            message="Document successfully ingested and indexed into knowledge base",
        )


# Global ingestion service instance
document_ingestion_service = DocumentIngestionService()
