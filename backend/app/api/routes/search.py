from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.dependencies.auth import get_current_user
from app.models.user import User
from app.search.client import search_client, WebSearchResult

router = APIRouter(prefix="/search", tags=["Search"])


class WebSearchRequest(BaseModel):
    query: str = Field(..., max_length=500, description="External web search query")
    num_results: int = Field(4, ge=1, le=10, description="Number of results to retrieve")
    location: Optional[str] = Field(None, description="Geographic search locality e.g. 'India'")


@router.post("/web", response_model=Dict[str, Any])
async def search_web_endpoint(
    req: WebSearchRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Executes a controlled external web search via SerpAPI for general knowledge queries
    that lie outside the closed community's institutional knowledge base.
    """
    clean_q = req.query.strip()
    if not clean_q:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Query string cannot be empty.",
        )

    results: List[WebSearchResult] = await search_client.search(
        query=clean_q,
        num_results=req.num_results,
        location=req.location,
    )

    return {
        "status": "success",
        "query": clean_q,
        "is_external": True,
        "results_count": len(results),
        "results": [r.model_dump() for r in results],
    }
