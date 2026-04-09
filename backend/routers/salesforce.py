from fastapi import Depends
from backend.services.auth import verify_api_key
"""
Salesforce Cases Integration — FastAPI Router
OAuth 2.0 username-password flow for Salesforce REST API.
Falls back to demo mode when credentials are not set.
"""
import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, HTTPException

logger = logging.getLogger("salesforce")
router = APIRouter(prefix="/salesforce", tags=["salesforce"], dependencies=[Depends(verify_api_key)])

# In-memory token cache: {access_token, instance_url, expires_at}
_token_cache: Dict[str, Any] = {}


# ── Auth ──────────────────────────────────────────────────────────────────────

def _is_configured() -> bool:
    return bool(os.getenv("SF_CLIENT_ID", "").strip() and os.getenv("SF_CLIENT_SECRET", "").strip())


async def _get_token() -> Dict[str, str]:
    """Get a valid Salesforce OAuth token, refreshing if expired."""
    if _token_cache.get("expires_at", 0) > time.time() + 60:
        return _token_cache

    login_url = os.getenv("SF_LOGIN_URL", "https://login.salesforce.com")
    params = {
        "grant_type": "password",
        "client_id": os.getenv("SF_CLIENT_ID", ""),
        "client_secret": os.getenv("SF_CLIENT_SECRET", ""),
        "username": os.getenv("SF_USERNAME", ""),
        "password": os.getenv("SF_PASSWORD", "") + os.getenv("SF_SECURITY_TOKEN", ""),
    }
    logger.info("[SF] Requesting OAuth token")
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(f"{login_url}/services/oauth2/token", data=params)
    resp.raise_for_status()
    data = resp.json()
    _token_cache.update({
        "access_token": data["access_token"],
        "instance_url": data["instance_url"],
        "expires_at": time.time() + 3600,
    })
    return _token_cache


# ── Demo data ─────────────────────────────────────────────────────────────────

def _demo_cases() -> List[Dict[str, Any]]:
    base = os.getenv("SF_INSTANCE_URL", "https://your-org.my.salesforce.com")
    return [
        {"id": "5001a","case_number": "00001203", "subject": "Network outage affecting Building 5",
         "status": "New", "priority": "High", "category": "Network",
         "url": f"{base}/lightning/r/Case/5001a/view"},
        {"id": "5002b","case_number": "00001198", "subject": "SD-WAN tunnel flapping — Branch Office East",
         "status": "In Progress", "priority": "Critical", "category": "Network",
         "url": f"{base}/lightning/r/Case/5002b/view"},
        {"id": "5003c","case_number": "00001185", "subject": "Firewall rule change request — PCI zone",
         "status": "Pending", "priority": "Medium", "category": "Network",
         "url": f"{base}/lightning/r/Case/5003c/view"},
        {"id": "5004d","case_number": "00001177", "subject": "VPN client cannot connect — remote users",
         "status": "Escalated", "priority": "High", "category": "Network",
         "url": f"{base}/lightning/r/Case/5004d/view"},
    ]


def _map_case(case: Dict[str, Any], instance_url: str) -> Dict[str, Any]:
    return {
        "id": case.get("Id", ""),
        "case_number": case.get("CaseNumber", ""),
        "subject": case.get("Subject", ""),
        "status": case.get("Status", ""),
        "priority": case.get("Priority", "Medium"),
        "category": case.get("Category__c", "Network"),
        "url": f"{instance_url}/lightning/r/Case/{case.get('Id', '')}/view",
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/cases")
async def list_cases():
    """Fetch Network Cases from Salesforce via SOQL. Returns demo data if not configured."""
    if not _is_configured():
        logger.info("[SF] Running in demo mode — no credentials configured")
        return {"demo": True, "cases": _demo_cases(), "total": len(_demo_cases())}

    try:
        token = await _get_token()
        soql = "SELECT Id, CaseNumber, Subject, Status, Priority, Category__c FROM Case WHERE Category__c = 'Network' ORDER BY Priority, CreatedDate DESC LIMIT 50"
        headers = {"Authorization": f"Bearer {token['access_token']}", "Accept": "application/json"}
        logger.info("[SF] SOQL: SELECT ... FROM Case WHERE Category = Network")
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{token['instance_url']}/services/data/v59.0/query",
                params={"q": soql}, headers=headers
            )
        resp.raise_for_status()
        data = resp.json()
        cases = [_map_case(c, token["instance_url"]) for c in data.get("records", [])]
        return {"demo": False, "cases": cases, "total": len(cases)}
    except httpx.HTTPStatusError as e:
        raise HTTPException(status_code=e.response.status_code, detail=f"Salesforce API error: {e.response.text}")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Salesforce connection failed: {str(e)}")


@router.get("/status")
async def salesforce_connection_status():
    """Check if Salesforce credentials are configured."""
    return {
        "configured": _is_configured(),
        "instance_url": os.getenv("SF_INSTANCE_URL", None),
    }
