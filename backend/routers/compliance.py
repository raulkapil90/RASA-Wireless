from fastapi import Depends
from backend.services.auth import verify_api_key
"""Compliance FastAPI router — violations, health score, HITL approve/propose, audit trigger."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from backend.db.database import get_db
from backend.db.models import ComplianceViolation
from backend.db.schemas import ComplianceViolationRead
from backend.compliance.audit_engine import audit_config, save_violations

router = APIRouter(prefix="/compliance", tags=["compliance"], dependencies=[Depends(verify_api_key)])


@router.get("/violations", response_model=List[ComplianceViolationRead])
def list_violations(status: str = None, db: Session = Depends(get_db)):
    """Return all violations, optionally filtered by status (open/proposed/resolved)."""
    q = db.query(ComplianceViolation)
    if status:
        q = q.filter_by(status=status)
    return q.order_by(ComplianceViolation.created_at.desc()).all()


@router.get("/score")
def get_health_score(db: Session = Depends(get_db)):
    """Return a fleet-wide compliance health score (0–100). Deducts 10 per open violation."""
    total = db.query(ComplianceViolation).count()
    open_count = db.query(ComplianceViolation).filter_by(status="open").count()
    proposed_count = db.query(ComplianceViolation).filter_by(status="proposed").count()
    score = max(0, 100 - (open_count * 10) - (proposed_count * 5))
    return {
        "score": score,
        "open_violations": open_count,
        "proposed_violations": proposed_count,
        "total_violations": total,
    }


@router.post("/violations/{violation_id}/propose")
def propose_fix(violation_id: str, db: Session = Depends(get_db)):
    """Move a violation from 'open' to 'proposed', generating a remediation proposal."""
    v = db.query(ComplianceViolation).filter_by(id=violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")
    if v.status != "open":
        raise HTTPException(status_code=400, detail=f"Cannot propose — current status: {v.status}")
    v.status = "proposed"
    db.commit()
    return {
        "status": "proposed",
        "violation_id": violation_id,
        "rule_id": v.rule_id,
        "remediation_cmd": v.remediation_cmd,
    }


@router.post("/violations/{violation_id}/approve")
def approve_fix(violation_id: str, db: Session = Depends(get_db)):
    """Approve a proposed fix — marks violation as resolved and records resolution time."""
    v = db.query(ComplianceViolation).filter_by(id=violation_id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")
    if v.status != "proposed":
        raise HTTPException(status_code=400, detail=f"Cannot approve — status must be 'proposed', got: {v.status}")
    v.status = "resolved"
    v.resolved_at = datetime.utcnow()
    db.commit()
    return {
        "status": "resolved",
        "violation_id": violation_id,
        "rule_id": v.rule_id,
        "message": f"Fix for rule {v.rule_id} approved and applied on {v.device_hostname}.",
    }


@router.post("/audit")
def run_manual_audit(payload: dict, db: Session = Depends(get_db)):
    """
    Manually trigger an audit for a device config text.
    Expected payload: { device_id, hostname, vendor, config_text }
    """
    required = ["device_id", "hostname", "vendor", "config_text"]
    missing = [k for k in required if k not in payload]
    if missing:
        raise HTTPException(status_code=422, detail=f"Missing fields: {missing}")

    violations = audit_config(
        payload["device_id"],
        payload["hostname"],
        payload["vendor"],
        payload["config_text"],
    )
    new_count = save_violations(violations, db)
    return {
        "violations_found": len(violations),
        "new_violations_saved": new_count,
        "vendor": payload["vendor"],
        "device": payload["hostname"],
    }


@router.get("/rules")
def list_rules():
    """Return all loaded compliance rules grouped by vendor."""
    from backend.compliance.rule_loader import list_all_rules
    return list_all_rules()
