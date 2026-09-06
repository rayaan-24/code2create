from typing import Dict, Any, List
from app.search.client import search_client


async def search_web_tool(
    query: str,
    num_results: int = 4,
) -> Dict[str, Any]:
    """
    AI tool executing external web search via SerpAPI.
    Returns structured results for summarization and source attribution.
    """
    results = await search_client.search(query=query, num_results=num_results)
    return {
        "query": query,
        "results_count": len(results),
        "results": [r.model_dump() for r in results],
    }
