"""
NEXORA — Database Re-Embedding Migration Script

Migrates existing KnowledgeChunk records from old MD5/pseudo-embeddings
to real 384-dimensional neural embeddings using SentenceTransformers (all-MiniLM-L6-v2).

Features:
- Idempotent and restartable
- Processes records in batches to conserve CPU and memory
- Preserves chunk content, metadata, foreign keys, and verification status
- Dry-run mode for previewing migrations without modifying the database

Usage:
    # Run in dry-run mode (preview without changes):
    python backend/scripts/reembed_chunks.py --dry-run

    # Execute full re-embedding:
    python backend/scripts/reembed_chunks.py --batch-size 50

    # Re-embed for a specific community only:
    python backend/scripts/reembed_chunks.py --community-id <COMMUNITY_UUID>
"""

import argparse
import json
import logging
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from app.database.session import SessionLocal
from app.models.chunk import KnowledgeChunk
from app.ai.retrieval.embeddings import embedding_provider

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("nexora.scripts.reembed")


def reembed_knowledge_chunks(
    db: Session,
    batch_size: int = 50,
    community_id: str = None,
    dry_run: bool = False,
) -> int:
    """
    Safely re-embed KnowledgeChunk records in batches using the real neural embedding model.
    """
    query = db.query(KnowledgeChunk)
    if community_id:
        query = query.filter(KnowledgeChunk.community_id == community_id)

    total_chunks = query.count()
    logger.info("Found %d total KnowledgeChunks to inspect.", total_chunks)

    if total_chunks == 0:
        logger.info("No chunks to re-embed.")
        return 0

    if dry_run:
        logger.info("[DRY RUN] Would process %d chunks in batches of %d. No changes committed.", total_chunks, batch_size)
        return total_chunks

    processed_count = 0
    offset = 0

    while offset < total_chunks:
        batch = query.order_by(KnowledgeChunk.created_at.asc()).offset(offset).limit(batch_size).all()
        if not batch:
            break

        chunk_texts = [c.content for c in batch]
        logger.info("Generating embeddings for batch of %d chunks (offset %d)...", len(batch), offset)

        try:
            embeddings = embedding_provider.embed_documents(chunk_texts)
        except Exception as e:
            logger.error("Failed to generate embeddings for batch at offset %d: %s", offset, e)
            raise

        for chunk, emb in zip(batch, embeddings):
            # Update native pgvector column and JSON fallback
            chunk.embedding = emb
            chunk.embedding_json = json.dumps(emb)

        db.commit()
        processed_count += len(batch)
        offset += batch_size
        logger.info("Successfully updated %d / %d chunks.", processed_count, total_chunks)

    logger.info("Completed re-embedding of %d chunks.", processed_count)
    return processed_count


def main():
    parser = argparse.ArgumentParser(description="Re-embed KnowledgeChunks with all-MiniLM-L6-v2")
    parser.add_argument("--batch-size", type=int, default=50, help="Batch size for embedding generation (default: 50)")
    parser.add_argument("--community-id", type=str, default=None, help="Filter by community ID")
    parser.add_argument("--dry-run", action="store_true", help="Simulate without committing changes")
    args = parser.parse_args()

    db: Session = SessionLocal()
    try:
        reembed_knowledge_chunks(
            db=db,
            batch_size=args.batch_size,
            community_id=args.community_id,
            dry_run=args.dry_run,
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
