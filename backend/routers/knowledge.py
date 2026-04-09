from fastapi import Depends
from backend.services.auth import verify_api_key
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from typing import Optional

from backend.db.database import get_db
from backend.db.models import RasaResolution
from backend.services.knowledge_base import confirm_resolution

router = APIRouter(prefix="/knowledge", tags=["Knowledge Base"], dependencies=[Depends(verify_api_key)])

@router.get("/resolutions")
def list_resolutions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    device_type: Optional[str] = None,
    issue_category: Optional[str] = None,
    min_confidence: Optional[float] = None,
    db: Session = Depends(get_db)
):
    query = db.query(RasaResolution).filter(RasaResolution.is_deleted == False)
    
    if device_type:
        query = query.filter(RasaResolution.device_type == device_type)
    if issue_category:
        query = query.filter(RasaResolution.issue_category == issue_category)
    if min_confidence is not None:
        query = query.filter(RasaResolution.confidence_score >= min_confidence)
    
    total = query.count()
    records = query.order_by(desc(RasaResolution.times_validated), desc(RasaResolution.last_seen)).offset(skip).limit(limit).all()
    
    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "resolutions": [
            {
                "id": r.id,
                "log_fingerprint": r.log_fingerprint,
                "device_type": r.device_type,
                "issue_category": r.issue_category,
                "root_cause": r.root_cause,
                "confidence_score": r.confidence_score,
                "times_validated": r.times_validated,
                "source": r.source,
                "created_at": r.created_at,
                "last_seen": r.last_seen
            } for r in records
        ]
    }

@router.get("/resolutions/{resolution_id}")
def get_resolution(resolution_id: str, db: Session = Depends(get_db)):
    record = db.query(RasaResolution).filter(
        RasaResolution.id == resolution_id,
        RasaResolution.is_deleted == False
    ).first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Resolution not found")
        
    return {
        "id": record.id,
        "log_fingerprint": record.log_fingerprint,
        "device_type": record.device_type,
        "issue_category": record.issue_category,
        "root_cause": record.root_cause,
        "resolution_steps": record.resolution_steps,
        "confidence_score": record.confidence_score,
        "times_validated": record.times_validated,
        "source": record.source,
        "client_env_tags": record.client_env_tags,
        "created_at": record.created_at,
        "last_seen": record.last_seen
    }

@router.post("/resolutions/{resolution_id}/confirm")
def confirm_res_endpoint(resolution_id: str, db: Session = Depends(get_db)):
    success = confirm_resolution(resolution_id)
    if not success:
        raise HTTPException(status_code=404, detail="Resolution not found")
        
    record = db.query(RasaResolution).filter(RasaResolution.id == resolution_id).first()
    return {"message": "Resolution confirmed successfully", "times_validated": record.times_validated}

@router.delete("/resolutions/{resolution_id}")
def delete_resolution(resolution_id: str, db: Session = Depends(get_db)):
    record = db.query(RasaResolution).filter(RasaResolution.id == resolution_id).first()
    if not record or record.is_deleted:
        raise HTTPException(status_code=404, detail="Resolution not found")
        
    record.is_deleted = True
    db.commit()
    return {"message": "Resolution soft deleted successfully"}

@router.get("/stats")
def get_knowledge_stats(db: Session = Depends(get_db)):
    base_query = db.query(RasaResolution).filter(RasaResolution.is_deleted == False)
    
    total_resolutions = base_query.count()
    total_validations = db.query(func.sum(RasaResolution.times_validated)).filter(RasaResolution.is_deleted == False).scalar() or 0
    
    # top 5 categories
    top_categories = db.query(
        RasaResolution.issue_category, 
        func.count(RasaResolution.id).label('count')
    ).filter(RasaResolution.is_deleted == False).group_by(RasaResolution.issue_category).order_by(desc('count')).limit(5).all()
    
    most_validated = base_query.order_by(desc(RasaResolution.times_validated)).first()
    
    return {
        "total_resolutions": total_resolutions,
        "total_validations": total_validations,
        "top_issue_categories": [{"category": c[0], "count": c[1]} for c in top_categories],
        "most_validated_resolution": {
            "id": most_validated.id,
            "issue_category": most_validated.issue_category,
            "times_validated": most_validated.times_validated
        } if most_validated else None,
        "cache_hit_rate": "N/A" # Hard to track historically without a hits table, but available conceptually
    }
