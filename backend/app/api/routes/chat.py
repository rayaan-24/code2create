import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from app.database.session import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.permissions import require_staff_or_admin
from app.models.user import User
from app.models.community import Community
from app.models.document import Document
from app.models.chunk import KnowledgeChunk
from app.models.conversation import ConversationSession, ConversationMessage
from app.schemas.response import ResponseEnvelope
from app.ai.orchestrator import orchestrator
from app.ai.schemas.response import AIResponse
from app.ai.retrieval.ingestion import DocumentParser
from app.ai.retrieval.chunking import SemanticChunker
from app.ai.retrieval.embeddings import embedding_provider

logger = logging.getLogger("nexora.api.chat")
router = APIRouter(prefix="/chat", tags=["AI Chat & Knowledge Ingestion"])


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str
    conversation_id: Optional[str] = None
    debug_mode: bool = False


@router.post("", response_model=ResponseEnvelope[AIResponse])
async def handle_chat(
    payload: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Primary conversational endpoint for NEXORA.
    Orchestrates intent detection, hybrid RAG retrieval, tool execution, SGLang inference,
    and returns grounded response with sources and actions.
    """
    community = db.query(Community).filter(Community.id == current_user.community_id).first()
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found for user",
        )

    response = await orchestrator.process_chat(
        db=db,
        current_user=current_user,
        community=community,
        raw_message=payload.message,
        conversation_id=payload.conversation_id,
        debug_mode=payload.debug_mode,
    )

    return ResponseEnvelope(data=response)


@router.get("/history", response_model=ResponseEnvelope[List[Dict[str, Any]]])
def get_user_chat_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve chat sessions and recent messages for the current user."""
    sessions = (
        db.query(ConversationSession)
        .filter(
            ConversationSession.user_id == current_user.id,
            ConversationSession.community_id == current_user.community_id,
        )
        .order_by(ConversationSession.updated_at.desc())
        .limit(20)
        .all()
    )

    history = []
    for s in sessions:
        history.append({
            "id": s.id,
            "title": s.title,
            "updated_at": s.updated_at.isoformat(),
            "created_at": s.created_at.isoformat(),
            "message_count": len(s.messages),
        })

    return ResponseEnvelope(data=history)


@router.post("/ingest", response_model=ResponseEnvelope[Dict[str, Any]])
async def ingest_document(
    title: str = Form(...),
    verification_status: str = Form("VERIFIED"),
    file: UploadFile = File(...),
    current_user: User = Depends(require_staff_or_admin),
    db: Session = Depends(get_db),
):
    """
    Staff / Admin endpoint to upload, parse, chunk, embed, and index documents
    into the community knowledge base.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )

    # 1. Parse document pages
    try:
        pages = DocumentParser.parse_file(file_bytes, file.filename)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Document parsing failed: {e}",
        )

    if not pages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No readable text could be extracted from the document",
        )

    # 2. Record Document in database
    doc_record = Document(
        community_id=current_user.community_id,
        title=title,
        file_name=file.filename,
        file_type=file.filename.split(".")[-1].lower(),
        uploaded_by=current_user.id,
        verification_status=verification_status,
        description=f"Indexed with {len(pages)} pages",
    )
    db.add(doc_record)
    db.commit()
    db.refresh(doc_record)

    # 3. Chunk pages
    chunker = SemanticChunker(target_chunk_chars=500, overlap_chars=80)
    chunks = chunker.chunk_pages(
        pages=pages,
        document_id=doc_record.id,
        community_id=current_user.community_id,
        document_title=title,
        verification_status=verification_status,
    )

    # 4. Generate embeddings and persist chunks
    created_chunks = 0
    for ch in chunks:
        emb = embedding_provider.embed_text(ch.content)
        chunk_obj = KnowledgeChunk(
            document_id=doc_record.id,
            community_id=current_user.community_id,
            content=ch.content,
            page_number=ch.page_number,
            section=ch.section,
            chunk_index=ch.chunk_index,
            token_count=ch.token_count,
            verification_status=verification_status,
        )
        chunk_obj.embedding = emb
        chunk_obj.metadata_dict = ch.metadata
        db.add(chunk_obj)
        created_chunks += 1

    db.commit()

    return ResponseEnvelope(
        data={
            "document_id": doc_record.id,
            "title": title,
            "pages_parsed": len(pages),
            "chunks_indexed": created_chunks,
            "verification_status": verification_status,
        }
    )
