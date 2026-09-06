from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.ai.retrieval.hybrid_search import HybridRetriever


def search_community_knowledge_tool(db: Session, community_id: str, query: str) -> List[Dict[str, Any]]:
    """Execute hybrid search on community documents and return matching chunks."""
    retriever = HybridRetriever()
    results = retriever.search(db, community_id, query, top_k=5)

    output = []
    for r in results:
        chunk = r.chunk
        output.append({
            "chunk_id": chunk.id,
            "content": chunk.content[:300],
            "section": chunk.section,
            "page": chunk.page_number,
            "verification_status": chunk.verification_status,
            "score": round(r.final_score, 2),
        })
    return output
