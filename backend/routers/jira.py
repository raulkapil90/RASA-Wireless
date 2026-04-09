from fastapi import Depends
from backend.services.auth import verify_api_key
"""
Jira Cloud Integration — FastAPI Router
Connects to Jira REST API v3 using Basic Auth (email + API token).
Falls back to demo mode when JIRA_API_TOKEN is not set.
"""
import base64
import logging
import os
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger("jira")
router = APIRouter(prefix="/jira", tags=["jira"], dependencies=[Depends(verify_api_key)])


# ── Auth helpers ──────────────────────────────────────────────────────────────

def _is_configured() -> bool:
    return bool(os.getenv("JIRA_API_TOKEN", "").strip())

def _headers() -> Dict[str, str]:
    email = os.getenv("JIRA_EMAIL", "")
    token = os.getenv("JIRA_API_TOKEN", "")
    creds = base64.b64encode(f"{email}:{token}".encode()).decode()
    return {
        "Authorization": f"Basic {creds}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

def _base() -> str:
    return os.getenv("JIRA_BASE_URL", "").rstrip("/")

def _project() -> str:
    return os.getenv("JIRA_PROJECT_KEY", "NETOPS")


# ── Pydantic models ───────────────────────────────────────────────────────────

class CreateTicketRequest(BaseModel):
    summary: str
    description: Optional[str] = ""
    priority: Optional[str] = "High"
    issue_type: Optional[str] = "Bug"


# ── Demo data ─────────────────────────────────────────────────────────────────

def _demo_tickets() -> List[Dict[str, Any]]:
    return [
        {"id": "1", "key": "NETOPS-101", "summary": "Core switch CPU spike in DC1 — investigate",
         "status": "In Progress", "priority": "High", "assignee": "Raul K",
         "url": "#", "created": "2026-03-14T10:00:00"},
        {"id": "2", "key": "NETOPS-102", "summary": "WLC HA failover detected — root cause unknown",
         "status": "Open", "priority": "Medium", "assignee": "Unassigned",
         "url": "#", "created": "2026-03-15T08:30:00"},
        {"id": "3", "key": "NETOPS-103", "summary": "PAN-OS security policy review required",
         "status": "Open", "priority": "Critical", "assignee": "Raul K",
         "url": "#", "created": "2026-03-15T11:00:00"},
        {"id": "4", "key": "NETOPS-104", "summary": "Arista BGP session flap — DC2 uplink",
         "status": "Resolved", "priority": "High", "assignee": "Raul K",
         "url": "#", "created": "2026-03-13T15:00:00"},
        {"id": "5", "key": "NETOPS-105", "summary": "IPAM pool utilization above 90% — Site C",
         "status": "Open", "priority": "Low", "assignee": "Unassigned",
         "url": "#", "created": "2026-03-16T07:00:00"},
    ]


def _map_issue(issue: Dict[str, Any]) -> Dict[str, Any]:
    f = issue.get("fields", {})
    assignee = f.get("assignee") or {}
    return {
        "id": issue.get("id", ""),
        "key": issue.get("key", ""),
        "summary": f.get("summary", ""),
        "status": (f.get("status") or {}).get("name", ""),
        "priority": (f.get("priority") or {}).get("name", "Medium"),
        "assignee": assignee.get("displayName", "Unassigned"),
        "url": f"{_base()}/browse/{issue.get('key', '')}",
        "created": f.get("created", ""),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/tickets")
async def list_tickets(status_filter: Optional[str] = None):
    """Fetch open Jira tickets for the NETOPS project. Returns demo data if not configured."""
    if not _is_configured():
        logger.info("[JIRA] Running in demo mode — no API token configured")
        tickets = _demo_tickets()
        if status_filter:
            tickets = [t for t in tickets if t["status"].lower() == status_filter.lower()]
        return {"demo": True, "issues": tickets, "total": len(tickets)}

    project = _project()
    jql = f'project = {project} AND status != Done ORDER BY priority ASC, created DESC'
    if status_filter:
        jql = f'project = {project} AND status = "{status_filter}" ORDER BY priority ASC'

    logger.info(f"[JIRA] GET /search JQL={jql!r}")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{_base()}/rest/api/3/search",
                params={"jql": jql, "maxResults": 50, "fields": "summary,status,priority,assignee,created"},
                headers=_headers(),
            )
        resp.raise_for_status()
        data = resp.json()
        issues = [_map_issue(i) for i in data.get("issues", [])]
        return {"demo": False, "issues": issues, "total": len(issues)}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Jira API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira connection failed: {str(e)}")


@router.post("/tickets")
async def create_ticket(payload: CreateTicketRequest):
    """Create a new Jira ticket. Returns mock response in demo mode."""
    if not _is_configured():
        logger.info("[JIRA] Demo mode — mocking ticket creation")
        return {"demo": True, "id": "10099", "key": "NETOPS-DEMO", "self": "#"}

    body = {
        "fields": {
            "project": {"key": _project()},
            "summary": payload.summary,
            "description": {
                "type": "doc", "version": 1,
                "content": [{"type": "paragraph", "content": [{"type": "text", "text": payload.description or ""}]}]
            },
            "issuetype": {"name": payload.issue_type},
            "priority": {"name": payload.priority},
        }
    }
    logger.info(f"[JIRA] POST /issue summary={payload.summary!r}")
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(f"{_base()}/rest/api/3/issue", json=body, headers=_headers())
        resp.raise_for_status()
        return {**resp.json(), "demo": False}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Jira API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Jira connection failed: {str(e)}")


@router.get("/status")
async def jira_connection_status():
    """Check if Jira credentials are configured."""
    return {
        "configured": _is_configured(),
        "base_url": _base() or None,
        "project": _project(),
    }
