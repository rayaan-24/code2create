import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict

from app.database.session import get_db
from app.dependencies.auth import get_current_user, get_current_user_optional
from app.dependencies.permissions import require_staff_or_admin
from app.models.user import User
from app.models.community import Community
from app.models.document import Document
from app.models.chunk import KnowledgeChunk
from app.models.conversation import ConversationSession, ConversationMessage
from app.schemas.response import ResponseEnvelope
from app.ai.orchestrator import orchestrator
from app.ai.schemas.response import AIResponse
from app.services.ingestion_service import document_ingestion_service

logger = logging.getLogger("nexora.api.chat")
router = APIRouter(prefix="/chat", tags=["AI Chat & Knowledge Ingestion"])


def get_chat_user(
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
) -> User:
    """Resolve current authenticated user or fall back to default demo student for guest visitors."""
    if current_user:
        return current_user
    demo_user = db.query(User).filter(User.email == "alex.rivera@nexora.edu").first()
    if not demo_user:
        demo_user = db.query(User).filter(User.is_active == True).first()
    if demo_user:
        return demo_user
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"code": "NOT_AUTHENTICATED", "message": "Authentication required"},
    )


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str
    conversation_id: Optional[str] = None
    debug_mode: bool = False


@router.post("", response_model=ResponseEnvelope[AIResponse])
async def handle_chat(
    payload: ChatRequest,
    current_user: User = Depends(get_chat_user),
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
    current_user: User = Depends(get_chat_user),
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

    result = document_ingestion_service.ingest_document(
        db=db,
        community_id=current_user.community_id,
        file_name=file.filename or "document.txt",
        file_bytes=file_bytes,
        user_id=current_user.id,
        title=title,
        auto_verify=(verification_status.upper() == "VERIFIED"),
    )

    return ResponseEnvelope(
        data={
            "document_id": result.document_id,
            "title": result.title,
            "file_name": result.file_name,
            "pages_parsed": result.pages_parsed,
            "chunks_indexed": result.chunks_created,
            "verification_status": result.verification_status,
            "storage_key": result.storage_key,
            "checksum": result.file_checksum,
        }
    )
