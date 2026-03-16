from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..db import models, schemas
from ..db.database import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/config", tags=["config"])

# --- Credential Profiles ---

@router.post("/profiles/credential", response_model=schemas.CredentialProfile)
def create_credential_profile(profile: schemas.CredentialProfileCreate, db: Session = Depends(get_db)):
    db_profile = models.CredentialProfile(**profile.model_dump())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("/profiles/credential", response_model=List[schemas.CredentialProfile])
def list_credential_profiles(db: Session = Depends(get_db)):
    return db.query(models.CredentialProfile).all()

# --- Monitoring Profiles ---

@router.post("/profiles/monitoring", response_model=schemas.MonitoringProfile)
def create_monitoring_profile(profile: schemas.MonitoringProfileCreate, db: Session = Depends(get_db)):
    db_profile = models.MonitoringProfile(**profile.model_dump())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("/profiles/monitoring", response_model=List[schemas.MonitoringProfile])
def list_monitoring_profiles(db: Session = Depends(get_db)):
    return db.query(models.MonitoringProfile).all()

# --- Pre-Commit Validation ---

@router.post("/devices/validate")
def validate_device(device: schemas.DeviceCreate, db: Session = Depends(get_db)):
    # 1. Connectivity Check Mock
    if not device.management_ip:
        raise HTTPException(status_code=400, detail="Management IP is required")
        
    # Mocking validation logic: fail if IP is a specific test IP
    if device.management_ip == "192.168.1.99":
        return {"valid": False, "error": "Connection Timeout: Host Unreachable (Port 22/443)"}
        
    # Verify profiles exist
    if device.credential_profile_id:
        cp = db.query(models.CredentialProfile).filter(models.CredentialProfile.id == device.credential_profile_id).first()
        if not cp:
            return {"valid": False, "error": f"Credential Profile {device.credential_profile_id} not found locally."}

    if device.monitoring_profile_id:
        mp = db.query(models.MonitoringProfile).filter(models.MonitoringProfile.id == device.monitoring_profile_id).first()
        if not mp:
            return {"valid": False, "error": f"Monitoring Profile {device.monitoring_profile_id} not found locally."}

    return {"valid": True, "message": "Device is reachable and profiles correspond. Pre-commit checks passed."}

# --- Devices ---

@router.post("/devices", response_model=schemas.Device)
def create_device(device: schemas.DeviceCreate, db: Session = Depends(get_db)):
    db_device = models.Device(**device.model_dump())
    db_device.status = "Online" # Assume it went green through validate first in UX
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.get("/devices", response_model=List[schemas.Device])
def list_devices(db: Session = Depends(get_db)):
    return db.query(models.Device).all()
