from sqlalchemy import Column, String, Boolean, Integer, JSON, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from .database import Base

def generate_uuid():
    return str(uuid.uuid4())

class CredentialProfile(Base):
    __tablename__ = "credential_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Store settings for snmp, ssh, api, etc.
    # e.g., {"snmp": {"version": "v3", "username": "admin"}, "ssh": {"port": 22}}
    auth_methods = Column(JSON, nullable=False, default=dict)
    
    devices = relationship("Device", back_populates="credential_profile")

class MonitoringProfile(Base):
    __tablename__ = "monitoring_profiles"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # e.g., {"snmp": {"enabled": True, "intervalSec": 300}, "gnmi": {"enabled": False}}
    collection_methods = Column(JSON, nullable=False, default=dict)
    
    # ["cpu", "memory", "interface_errors"]
    metrics = Column(JSON, nullable=False, default=list)
    
    devices = relationship("Device", back_populates="monitoring_profile")

class Device(Base):
    __tablename__ = "devices"

    id = Column(String, primary_key=True, default=generate_uuid)
    hostname = Column(String, nullable=False)
    management_ip = Column(String, nullable=False, unique=True)
    
    vendor = Column(String, nullable=False) # e.g., Cisco, Palo Alto, AWS
    role = Column(String, nullable=False)   # e.g., Core Switch, Edge Firewall
    
    credential_profile_id = Column(String, ForeignKey("credential_profiles.id"), nullable=True)
    monitoring_profile_id = Column(String, ForeignKey("monitoring_profiles.id"), nullable=True)
    
    # Store siteLocation, owner, lifecycleStatus, businessCriticality
    tags = Column(JSON, nullable=False, default=dict)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String, default="Offline") # Online, Offline, Error
    
    credential_profile = relationship("CredentialProfile", back_populates="devices")
    monitoring_profile = relationship("MonitoringProfile", back_populates="devices")
