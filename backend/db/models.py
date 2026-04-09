from sqlalchemy import Column, String, JSON, ForeignKey, DateTime, Integer, Float, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime

from .database import Base

def generate_uuid():
    return str(uuid.uuid4())


class CredentialProfile(Base):
    __tablename__ = "credential_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    auth_methods = Column(JSON, nullable=False, default=dict)
    devices = relationship("Device", back_populates="credential_profile")


class MonitoringProfile(Base):
    __tablename__ = "monitoring_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    collection_methods = Column(JSON, nullable=False, default=dict)
    metrics = Column(JSON, nullable=False, default=list)
    devices = relationship("Device", back_populates="monitoring_profile")


class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, default=generate_uuid)
    hostname = Column(String, nullable=False)
    management_ip = Column(String, nullable=False, unique=True)
    vendor = Column(String, nullable=False)
    role = Column(String, nullable=False)
    credential_profile_id = Column(String, ForeignKey("credential_profiles.id"), nullable=True)
    monitoring_profile_id = Column(String, ForeignKey("monitoring_profiles.id"), nullable=True)
    tags = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="Offline")
    credential_profile = relationship("CredentialProfile", back_populates="devices")
    monitoring_profile = relationship("MonitoringProfile", back_populates="devices")


class ComplianceViolation(Base):
    __tablename__ = "compliance_violations"

    id = Column(String, primary_key=True, default=generate_uuid)
    device_id = Column(String, nullable=False)
    device_hostname = Column(String, nullable=False)
    vendor = Column(String, nullable=False)
    rule_id = Column(String, nullable=False)
    rule_description = Column(String, nullable=False)
    severity = Column(String, nullable=False)   # HIGH / MEDIUM / LOW
    status = Column(String, default="open")     # open / proposed / resolved
    remediation_cmd = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)


class ExternalIntegration(Base):
    __tablename__ = "external_integrations"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    url = Column(String, nullable=False)
    auth_type = Column(String, default="none")   # none / token / oauth
    icon = Column(String, default="Globe")
    description = Column(String, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class RasaResolution(Base):
    __tablename__ = "rasa_resolutions"

    id = Column(String, primary_key=True, default=generate_uuid)
    log_fingerprint = Column(String, index=True, nullable=False)
    device_type = Column(String, default="unknown")
    issue_category = Column(String, nullable=False)
    root_cause = Column(String, nullable=False)
    resolution_steps = Column(JSON, nullable=False, default=list)
    confidence_score = Column(Float, nullable=False)
    times_validated = Column(Integer, default=0)
    source = Column(String, default="llm_consensus")
    client_env_tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow)
    is_deleted = Column(Boolean, default=False)
