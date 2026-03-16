from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime


# --- Credential Profiles ---

class CredentialProfileBase(BaseModel):
    name: str
    description: Optional[str] = None
    auth_methods: Dict[str, Any]

class CredentialProfileCreate(CredentialProfileBase):
    pass

class CredentialProfile(CredentialProfileBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Monitoring Profiles ---

class MonitoringProfileBase(BaseModel):
    name: str
    description: Optional[str] = None
    collection_methods: Dict[str, Any]
    metrics: List[str]

class MonitoringProfileCreate(MonitoringProfileBase):
    pass

class MonitoringProfile(MonitoringProfileBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


# --- Devices ---

class DeviceBase(BaseModel):
    hostname: str
    management_ip: str
    vendor: str
    role: str
    credential_profile_id: Optional[str] = None
    monitoring_profile_id: Optional[str] = None
    tags: Dict[str, str] = {}

class DeviceCreate(DeviceBase):
    pass

class Device(DeviceBase):
    id: str
    created_at: datetime
    status: str
    model_config = ConfigDict(from_attributes=True)


# --- Compliance ---

class ComplianceViolationCreate(BaseModel):
    device_id: str
    device_hostname: str
    vendor: str
    rule_id: str
    rule_description: str
    severity: str
    remediation_cmd: Optional[str] = None

class ComplianceViolationRead(ComplianceViolationCreate):
    id: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
