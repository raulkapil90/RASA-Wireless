"""
ARKS NetOps AI - FastAPI Application
======================================
REST API bridge that allows a Rasa-based front-end (or any HTTP client)
to query the multi-agent RAG engine via semantic search.

Every response includes:
  • answer       – The synthesised answer text (Markdown)
  • sources      – Array of { title, url, type, relevance }
  • confidence   – 0-1 confidence score
  • escalated    – Boolean; true when no documentation was found
  • review       – CLI review report from Agent C

Start with:
    uvicorn backend.main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agents import AgentOrchestrator
from .database import VectorDB
from .ingestion import run_full_ingestion

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── Lifespan ──────────────────────────────────────────────────────────────

orchestrator: Optional[AgentOrchestrator] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global orchestrator
    logger.info("Initialising ARKS NetOps AI engine …")
    orchestrator = AgentOrchestrator()
    logger.info("Engine ready.")
    yield
    logger.info("Shutting down.")


# ── App ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ARKS NetOps AI",
    description="Multi-Agent RAG engine for Cisco Catalyst Wireless ecosystems.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response Models ─────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, description="The user's natural-language question or symptom description.")
    doc_type: Optional[str] = Field(None, description="Optional filter: 'doc', 'bug', or 'forum'.")


class SourceLink(BaseModel):
    title: str
    url: str
    type: str
    relevance: float


class ReviewReport(BaseModel):
    status: str  # "passed" | "flagged"
    details: str


class QueryResponse(BaseModel):
    answer: str
    sources: list[SourceLink]
    confidence: float
    escalated: bool
    review: ReviewReport


class IngestionResponse(BaseModel):
    timestamp: str
    sources_processed: int
    chunks_added: int
    errors: list[str]


class HealthResponse(BaseModel):
    status: str
    version: str
    documents_indexed: int


# ── Endpoints ─────────────────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
async def health():
    """Health-check endpoint."""
    db = VectorDB()
    count = db.collection.count()
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        documents_indexed=count,
    )


@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """
    Primary endpoint for the Rasa integration.

    Accepts a natural-language query, runs it through the three-agent
    pipeline, and returns a structured response with source citations.
    """
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Engine not ready.")

    try:
        result = orchestrator.process_query(request.query)
    except Exception as exc:
        logger.exception("Query processing failed.")
        raise HTTPException(status_code=500, detail=str(exc))

    return QueryResponse(
        answer=result["answer"],
        sources=[SourceLink(**s) for s in result["sources"]],
        confidence=result["confidence"],
        escalated=result["escalated"],
        review=ReviewReport(**result["review"]),
    )


@app.post("/ingest", response_model=IngestionResponse)
async def ingest():
    """
    Manually triggers a full ingestion cycle.
    Useful for testing or forcing an immediate update.
    """
    try:
        summary = run_full_ingestion()
    except Exception as exc:
        logger.exception("Ingestion failed.")
        raise HTTPException(status_code=500, detail=str(exc))

    return IngestionResponse(**summary)


@app.get("/sources")
async def list_sources():
    """Returns a summary of all indexed sources."""
    db = VectorDB()
    all_items = db.collection.get(include=["metadatas"])
    unique: dict[str, dict] = {}
    for meta in all_items["metadatas"]:
        url = meta.get("source_url", "unknown")
        if url not in unique:
            unique[url] = {
                "title": meta.get("title", "Unknown"),
                "url": url,
                "type": meta.get("type", "doc"),
                "last_updated": meta.get("timestamp", ""),
                "chunks": 0,
            }
        unique[url]["chunks"] += 1

    return {"sources": list(unique.values()), "total": len(unique)}
