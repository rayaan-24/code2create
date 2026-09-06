import pytest
from app.ai.retrieval.ingestion import DocumentParser, ParsedPage
from app.ai.retrieval.chunking import SemanticChunker
from app.ai.retrieval.embeddings import embedding_provider
from app.ai.retrieval.vector_search import VectorSearchEngine
from app.ai.retrieval.keyword_search import KeywordSearchEngine
from app.ai.retrieval.hybrid_search import HybridRetriever
from app.ai.retrieval.reranking import Reranker
from app.models.chunk import KnowledgeChunk


def test_document_parser_text():
    sample_text = """# Chapter 1: Admission Guidelines
Students must complete orientation within 14 days.

# Chapter 2: Security Credentials
All students must wear their smart RFID badge at all times."""

    pages = DocumentParser.parse_text(sample_text, "handbook.md")
    assert len(pages) == 2
    assert pages[0].section == "Chapter 1: Admission Guidelines"
    assert "orientation" in pages[0].content
    assert pages[1].section == "Chapter 2: Security Credentials"
    assert "smart RFID badge" in pages[1].content


def test_semantic_chunker():
    pages = [
        ParsedPage(
            page_number=1,
            content="This is paragraph one about registration rules.\n\nThis is paragraph two about document verification.",
            section="Section 1",
        )
    ]
    chunker = SemanticChunker(target_chunk_chars=100, overlap_chars=20)
    chunks = chunker.chunk_pages(pages, document_title="Test Handbook")
    assert len(chunks) >= 1
    assert chunks[0].page_number == 1
    assert chunks[0].section == "Section 1"
    assert chunks[0].metadata["document_title"] == "Test Handbook"


def test_embeddings_generation():
    vec = embedding_provider.embed_text("Student ID Card Replacement")
    assert len(vec) == 384
    # Check L2 normalization: sum(x^2) == 1.0
    norm_sq = sum(x * x for x in vec)
    assert abs(norm_sq - 1.0) < 1e-4


def test_hybrid_search(db_session, community_a):
    retriever = HybridRetriever(vector_weight=0.6, keyword_weight=0.4)
    results = retriever.search(
        db=db_session,
        community_id=community_a.id,
        query="Where do I replace lost ID card and what is the fee?",
        top_k=3,
    )
    assert len(results) > 0
    top_chunk = results[0].chunk
    assert "ID Card" in top_chunk.content or "$15" in top_chunk.content
    assert results[0].final_score > 0.1


def test_reranker_and_attribution(db_session, community_a):
    retriever = HybridRetriever()
    results = retriever.search(db_session, community_a.id, "Library operating hours", top_k=3)
    reranker = Reranker(top_k=2)
    context_str, sources = reranker.rerank_and_format(results)

    assert "Central Library" in context_str or "Handbook" in context_str
    assert len(sources) > 0
    assert sources[0].verified is True
