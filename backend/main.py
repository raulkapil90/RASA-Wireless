"""
ARKS NetOps AI - FastAPI Application
======================================
REST API bridge that allows a Rasa-based front-end (or any HTTP client)
to query the multi-agent RAG engine AND the Cisco Catalyst Center
integration layer via semantic search and live telemetry.

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
import os
from contextlib import asynccontextmanager
from typing import Optional

from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

# ── Sentry Error Tracking (must init BEFORE FastAPI app is created) ──────
from . import config as settings
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            SqlalchemyIntegration(),
        ],
        traces_sample_rate=0.2,
        profiles_sample_rate=0.1,
        environment=settings.ENVIRONMENT,
    )

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .agents import AgentOrchestrator
from .ccc.auth import CccAuth
from .ccc.client import CccClient
from .ccc.models import (
    CccIssue,
    IpamForecast,
    RemediationProposal,
    ExecutionResult,
    ReportRequest,
    ReportStatus,
)
from .database import VectorDB
from .ingestion import run_full_ingestion
from .predictive.ipam_engine import predict_all
from .remediation.proposal import build_remediation, mark_approved
from .remediation.executor import execute_approved
from .reports.report_engine import generate_report
from .webhooks.router import router as webhook_router
from .llm_analyzer import analyze_syslogs

from .routers.config import router as config_router
from .routers.compliance import router as compliance_router
from .routers.jira import router as jira_router
from .routers.salesforce import router as salesforce_router
from .routers.integrations import router as integrations_router
from .routers.knowledge import router as knowledge_router
from .db.database import engine, Base

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# Initialize SQLite tables
Base.metadata.create_all(bind=engine)

# ── Lifespan ──────────────────────────────────────────────────────────────

orchestrator: Optional[AgentOrchestrator] = None
ccc_client: Optional[CccClient] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global orchestrator, ccc_client
    logger.info("Initialising ARKS NetOps AI engine …")
    orchestrator = AgentOrchestrator()
    ccc_client = CccClient()
    mode = "DEMO" if ccc_client.auth.is_demo_mode else "LIVE"
    logger.info("Engine ready. CCC mode: %s", mode)
    # Start syslog receiver for real-time config-change detection
    from .compliance.syslog_receiver import start_syslog_server
    import asyncio
    asyncio.create_task(start_syslog_server())
    yield
    logger.info("Shutting down.")


# ── App ───────────────────────────────────────────────────────────────────

app = FastAPI(
    title="ARKS NetOps AI",
    description="Multi-Agent RAG engine + Cisco Catalyst Center AIOps platform.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://netops-ai-rasa-rahuls-projects-c2478977.vercel.app",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Mount Routers ────────────────────────────────────────────────────────
app.include_router(webhook_router, prefix="/webhooks")
app.include_router(config_router)
app.include_router(compliance_router)
app.include_router(jira_router)
app.include_router(salesforce_router)
app.include_router(integrations_router)
app.include_router(knowledge_router)


# ── Protected API Router ──────────────────────────────────────────────────
from fastapi import APIRouter, Depends
from .services.auth import verify_api_key

api_router = APIRouter(dependencies=[Depends(verify_api_key)])


# ── Request / Response Models ─────────────────────────────────────────────

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=3, description="The user's natural-language question or symptom description.")
    doc_type: Optional[str] = Field(None, description="Optional filter: 'doc', 'bug', or 'forum'.")


class LogAnalysisRequest(BaseModel):
    logs: str = Field(..., description="Raw syslog data to analyze")

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
    ccc_mode: str


# ── Existing Endpoints ────────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def api_health():
    """Health-check endpoint."""
    db = VectorDB()
    count = db.collection.count()
    mode = "demo" if (ccc_client and ccc_client.auth.is_demo_mode) else "live"
    return HealthResponse(
        status="healthy",
        version="2.0.0",
        documents_indexed=count,
        ccc_mode=mode,
    )


@api_router.post("/query", response_model=QueryResponse)
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


@api_router.post("/ingest", response_model=IngestionResponse)
async def ingest():
    """Manually triggers a full ingestion cycle."""
    try:
        summary = run_full_ingestion()
    except Exception as exc:
        logger.exception("Ingestion failed.")
        raise HTTPException(status_code=500, detail=str(exc))
    return IngestionResponse(**summary)


@api_router.post("/analyze-logs")
async def analyze_wireless_logs(request: LogAnalysisRequest):
    """
    Multi-LLM Consensus Engine: Fan-out to Claude, GPT-4o & Gemini in parallel,
    then Fan-in via a Claude Synthesizer to produce authoritative JSON findings.
    Now with two-tier lookup.
    """
    from .services.knowledge_base import lookup_internal, store_resolution
    from .llm_analyzer import consensus_analyze
    try:
        # Tier 1: Check internal DB and Semantic Memory
        match = lookup_internal(request.logs)
        if match:
            return {"source": "internal_db", "findings": [match], "tier": 1}

        # Tier 2: Process via LLM Consensus
        findings = await consensus_analyze(request.logs)
        
        # Store high-confidence findings into DB
        for finding in findings:
            if finding.get("confidence", 0) >= 80:
                store_resolution(
                    log_text=request.logs,
                    device_type="unknown",
                    issue_category=finding.get("category", "GENERAL"),
                    root_cause=finding.get("diagnosis", ""),
                    resolution_steps=finding.get("remediation", []),
                    confidence_score=finding.get("confidence", 0) / 100.0,
                    source="llm_consensus"
                )
                
        return {"source": "llm_consensus", "findings": findings, "tier": 2}
    except Exception as exc:
        logger.exception("Consensus Log Analysis failed.")
        raise HTTPException(status_code=500, detail=str(exc))


@api_router.get("/sources")
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


# ══════════════════════════════════════════════════════════════════════════
# CCC ENDPOINTS — Cisco Catalyst Center AIOps Integration
# ══════════════════════════════════════════════════════════════════════════


# ── Issues ────────────────────────────────────────────────────────────────

@api_router.get("/ccc/issues")
async def get_ccc_issues(priority: Optional[str] = None, limit: int = 25):
    """
    Fetches active issues from Cisco Catalyst Center.
    Returns issues with Narrative Intelligence summaries.
    """
    if ccc_client is None:
        raise HTTPException(status_code=503, detail="CCC client not ready.")

    try:
        issues = ccc_client.get_issues(priority=priority, limit=limit)
        # Enrich with narrative intelligence
        from .webhooks.narrative import translate_issue
        enriched = []
        for issue in issues:
            narrative = translate_issue(issue.model_dump(by_alias=True))
            enriched.append({
                "issue": issue.model_dump(),
                "narrative": narrative.model_dump(),
            })
        return {"issues": enriched, "total": len(enriched)}
    except Exception as exc:
        logger.exception("Failed to fetch CCC issues.")
        raise HTTPException(status_code=500, detail=str(exc))


# ── IPAM Forecast ─────────────────────────────────────────────────────────

@api_router.get("/ccc/ipam/forecast")
async def get_ipam_forecast():
    """
    Predicts IP pool exhaustion using linear regression.
    Returns utilization metrics + days-to-exhaustion for each pool.
    """
    if ccc_client is None:
        raise HTTPException(status_code=503, detail="CCC client not ready.")

    try:
        pools = ccc_client.get_ip_pools()
        forecasts = predict_all(pools)
        return {
            "forecasts": [f.model_dump() for f in forecasts],
            "total_pools": len(forecasts),
        }
    except Exception as exc:
        logger.exception("IPAM forecast failed.")
        raise HTTPException(status_code=500, detail=str(exc))


# ── Reports ───────────────────────────────────────────────────────────────

@api_router.post("/ccc/reports")
async def trigger_ccc_report(request: ReportRequest):
    """
    Triggers asynchronous CCC report generation.
    Returns execution_id for status polling.
    """
    if ccc_client is None:
        raise HTTPException(status_code=503, detail="CCC client not ready.")

    result = generate_report(request, ccc_client)
    return result.model_dump()


# ── HITL Remediation ──────────────────────────────────────────────────────

@api_router.post("/ccc/remediate/propose")
async def propose_remediation(issue_id: str):
    """
    Proposes a remediation for a CCC issue.
    Returns the exact API payload but does NOT execute it.
    User must approve before execution.
    """
    if ccc_client is None:
        raise HTTPException(status_code=503, detail="CCC client not ready.")

    # Fetch the issue
    try:
        issues = ccc_client.get_issues()
        issue = next((i for i in issues if i.issue_id == issue_id), None)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch issue: {exc}")

    if not issue:
        raise HTTPException(status_code=404, detail=f"Issue '{issue_id}' not found.")

    proposal = build_remediation(issue)
    return proposal.model_dump()


@api_router.post("/ccc/remediate/approve/{proposal_id}")
async def approve_remediation(proposal_id: str):
    """
    Approves a remediation proposal.
    Must be called before /ccc/remediate/execute.
    """
    success = mark_approved(proposal_id)
    if not success:
        raise HTTPException(
            status_code=410,
            detail=f"Proposal '{proposal_id}' not found or expired. Re-propose.",
        )
    return {"status": "approved", "proposal_id": proposal_id}


@api_router.post("/ccc/remediate/execute/{proposal_id}")
async def execute_remediation_endpoint(proposal_id: str):
    """
    Executes a previously approved remediation.
    Will only execute if the proposal exists, hasn't expired, and is approved.
    """
    if ccc_client is None:
        raise HTTPException(status_code=503, detail="CCC client not ready.")

    result = execute_approved(proposal_id, ccc_client)
    if not result.success:
        raise HTTPException(status_code=400, detail=result.message)
    return result.model_dump()


# ── Sentry Test Route (temporary — remove before production) ──────────────
# Remove this route before production
@app.get("/api/sentry-test", tags=["debug"])
async def sentry_test():
    """Intentionally raises an exception to verify Sentry capture pipeline."""
    raise Exception("Sentry test")


# Attach the populated router
app.include_router(api_router)