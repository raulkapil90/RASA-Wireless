"""
CCC SDK — Pydantic Models
===========================
Typed data models for Cisco Catalyst Center API payloads.
All models use Optional fields to gracefully handle partial API responses.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ─── Enums ────────────────────────────────────────────────────────────────────


class IssueSeverity(str, Enum):
    P1 = "P1"
    P2 = "P2"
    P3 = "P3"
    P4 = "P4"


class IssuePriority(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class RemediationRisk(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ReportCategory(str, Enum):
    WIRELESS_INTERFERENCE = "Wireless Interference"
    TOP_TALKERS = "Top Talkers"
    CLIENT_HEALTH = "Client Health"
    NETWORK_HEALTH = "Network Health"
    AP_PERFORMANCE = "AP Performance"


# ─── CCC Issue ────────────────────────────────────────────────────────────────


class CccIssue(BaseModel):
    """Represents a single issue from the CCC Issues API."""

    issue_id: str = Field(..., alias="issueId")
    name: str = Field("", alias="issueName")
    description: str = Field("", alias="issueDescription")
    severity: str = Field("P4", alias="issueSeverity")
    priority: str = Field("LOW", alias="issuePriority")
    category: str = Field("", alias="issueCategory")
    entity_type: str = Field("", alias="issueEntityType")
    entity_value: str = Field("", alias="issueEntityValue")
    source: str = Field("", alias="issueSource")
    status: str = Field("active", alias="issueStatus")
    suggested_actions: list[str] = Field(default_factory=list, alias="suggestedActions")
    timestamp: Optional[int] = Field(None, alias="issueTimestamp")

    class Config:
        populate_by_name = True


# ─── IPAM / IP Pool ──────────────────────────────────────────────────────────


class IpPool(BaseModel):
    """Represents a single IP pool from the IPAM API."""

    id: str = Field(..., alias="id")
    ip_pool_name: str = Field("", alias="ipPoolName")
    ip_pool_type: str = Field("", alias="ipPoolType")
    ip_pool_cidr: str = Field("", alias="ipPoolCidr")
    gateway: str = Field("", alias="gateways")
    total_ip_address_count: int = Field(0, alias="totalIpAddressCount")
    used_ip_address_count: int = Field(0, alias="usedIpAddressCount")
    free_ip_address_count: int = Field(0, alias="freeIpAddressCount")
    dhcp_server_ips: list[str] = Field(default_factory=list, alias="dhcpServerIps")
    dns_server_ips: list[str] = Field(default_factory=list, alias="dnsServerIps")
    site_id: Optional[str] = Field(None, alias="siteId")

    class Config:
        populate_by_name = True

    @property
    def utilization_pct(self) -> float:
        if self.total_ip_address_count == 0:
            return 0.0
        return round(
            (self.used_ip_address_count / self.total_ip_address_count) * 100, 2
        )


# ─── IPAM Forecast ────────────────────────────────────────────────────────────


class IpamForecast(BaseModel):
    """Prediction result for a single IP pool."""

    pool_name: str
    pool_cidr: str
    current_utilization_pct: float
    used: int
    total: int
    free: int
    days_to_exhaustion: Optional[float] = None
    trend: str = "stable"  # "growing" | "stable" | "shrinking"
    confidence: float = 0.0
    risk_level: str = "LOW"


# ─── Report ───────────────────────────────────────────────────────────────────


class ReportRequest(BaseModel):
    """User-facing request to generate a CCC report."""

    report_type: ReportCategory
    time_range_hours: int = Field(default=24, ge=1, le=720)
    site_id: Optional[str] = None


class ReportStatus(BaseModel):
    """Status of an async CCC report execution."""

    execution_id: str
    report_type: str
    status: str = "IN_PROGRESS"
    message: str = ""
    download_url: Optional[str] = None


# ─── Remediation ──────────────────────────────────────────────────────────────


class RemediationProposal(BaseModel):
    """A proposed fix for a CCC issue, awaiting user approval."""

    proposal_id: str
    issue_id: str
    issue_name: str
    description: str
    risk_level: RemediationRisk
    api_endpoint: str
    api_method: str  # "GET" | "POST" | "PUT" | "DELETE"
    api_body: dict[str, Any] = Field(default_factory=dict)
    human_readable_action: str
    expires_at: datetime
    approved: bool = False


class ExecutionResult(BaseModel):
    """Result of an executed remediation."""

    proposal_id: str
    success: bool
    ccc_response_code: int
    ccc_response_body: dict[str, Any] = Field(default_factory=dict)
    message: str


# ─── Narrative Intelligence ───────────────────────────────────────────────────


class NarrativeInsight(BaseModel):
    """Human-readable AI insight translated from a raw CCC event."""

    event_id: str
    severity: str
    plain_english_summary: str
    affected_devices: list[str] = Field(default_factory=list)
    suggested_action: str = ""
    raw_category: str = ""
    timestamp: Optional[datetime] = None
