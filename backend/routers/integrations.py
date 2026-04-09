from fastapi import Depends
from backend.services.auth import verify_api_key
"""
External Integrations Hub — FastAPI Router
CRUD for registered external monitoring tools + connectivity ping.
"""
import asyncio
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.db.database import get_db
from backend.db.models import ExternalIntegration

logger = logging.getLogger("integrations")
router = APIRouter(prefix="/integrations", tags=["integrations"], dependencies=[Depends(verify_api_key)])

# ── Pydantic models ───────────────────────────────────────────────────────────

class IntegrationCreate(BaseModel):
    name: str
    url: str
    auth_type: Optional[str] = "none"   # none / token / oauth
    icon: Optional[str] = "Globe"
    description: Optional[str] = ""

class IntegrationRead(IntegrationCreate):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Pre-seeded default tools ──────────────────────────────────────────────────

DEFAULT_TOOLS = [
    {"name": "Grafana", "url": "http://localhost:3000", "auth_type": "none", "icon": "BarChart3", "description": "Metrics & dashboards"},
    {"name": "Kibana", "url": "http://localhost:5601", "auth_type": "none", "icon": "Search", "description": "Log analytics (ELK stack)"},
    {"name": "Datadog", "url": "https://app.datadoghq.com", "auth_type": "token", "icon": "Activity", "description": "Full-stack observability"},
    {"name": "PagerDuty", "url": "https://app.pagerduty.com", "auth_type": "token", "icon": "Bell", "description": "Incident management & on-call"},
    {"name": "Zabbix", "url": "http://localhost:8080/zabbix", "auth_type": "none", "icon": "Monitor", "description": "Network & infrastructure monitoring"},
]


def _seed_defaults(db: Session):
    """Seed default tools if the table is empty."""
    if db.query(ExternalIntegration).count() == 0:
        for t in DEFAULT_TOOLS:
            db.add(ExternalIntegration(id=str(uuid.uuid4()), created_at=datetime.utcnow(), **t))
        db.commit()
        logger.info("[INTEGRATIONS] Seeded 5 default monitoring tools")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/", response_model=List[Dict[str, Any]])
def list_integrations(db: Session = Depends(get_db)):
    """Return all registered integrations."""
    _seed_defaults(db)
    rows = db.query(ExternalIntegration).order_by(ExternalIntegration.created_at).all()
    return [{"id": r.id, "name": r.name, "url": r.url, "auth_type": r.auth_type,
             "icon": r.icon, "description": r.description, "created_at": r.created_at.isoformat()} for r in rows]


@router.post("/", response_model=Dict[str, Any])
def create_integration(payload: IntegrationCreate, db: Session = Depends(get_db)):
    """Register a new external tool."""
    row = ExternalIntegration(
        id=str(uuid.uuid4()), created_at=datetime.utcnow(),
        name=payload.name, url=payload.url, auth_type=payload.auth_type,
        icon=payload.icon, description=payload.description,
    )
    db.add(row)
    db.commit()
    logger.info(f"[INTEGRATIONS] Registered: {payload.name} → {payload.url}")
    return {"id": row.id, "name": row.name, "url": row.url, "auth_type": row.auth_type,
            "icon": row.icon, "description": row.description}


@router.delete("/{integration_id}")
def delete_integration(integration_id: str, db: Session = Depends(get_db)):
    """Remove a registered tool."""
    row = db.query(ExternalIntegration).filter_by(id=integration_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")
    db.delete(row)
    db.commit()
    logger.info(f"[INTEGRATIONS] Removed: {row.name}")
    return {"status": "deleted", "name": row.name}


@router.get("/{integration_id}/ping")
async def ping_integration(integration_id: str, db: Session = Depends(get_db)):
    """HEAD request to check if the tool URL is reachable."""
    row = db.query(ExternalIntegration).filter_by(id=integration_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Integration not found")

    try:
        async with httpx.AsyncClient(timeout=5, follow_redirects=True) as client:
            resp = await client.head(row.url)
        ok = resp.status_code < 500
        logger.info(f"[INTEGRATIONS] Ping {row.name}: {resp.status_code}")
        return {"id": integration_id, "name": row.name, "url": row.url, "online": ok, "status_code": resp.status_code}
    except Exception as e:
        return {"id": integration_id, "name": row.name, "url": row.url, "online": False, "error": str(e)}
