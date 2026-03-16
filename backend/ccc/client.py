"""
CCC SDK — API Client
=====================
Thin, typed wrapper around Cisco Catalyst Center REST APIs.

All methods return Pydantic models or raise CCCApiError.
When CCC_BASE_URL is not configured, returns realistic demo data.
"""

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone

import requests
from requests.exceptions import ConnectionError as ReqConnectionError
from requests.exceptions import Timeout as ReqTimeout

from .auth import CccAuth
from .exceptions import (
    CCCApiError,
    CCCConnectionError,
    CCCRateLimitError,
    CCCTimeoutError,
)
from .models import CccIssue, ExecutionResult, IpPool, RemediationProposal, ReportStatus

logger = logging.getLogger(__name__)

# Default timeout for all CCC API calls (seconds)
_DEFAULT_TIMEOUT = 30


class CccClient:
    """
    Cisco Catalyst Center API client.

    Usage:
        client = CccClient()
        issues = client.get_issues()
    """

    def __init__(self, auth: CccAuth | None = None):
        self.auth = auth or CccAuth()
        self.base_url = self.auth.base_url
        self.verify_ssl = self.auth.verify_ssl

    # ── Issues API ────────────────────────────────────────────────────────

    def get_issues(self, priority: str = None, limit: int = 25) -> list[CccIssue]:
        """
        Fetches active issues from CCC.
        GET /dna/intent/api/v1/issues
        """
        if self.auth.is_demo_mode:
            return self._demo_issues()

        params = {"limit": limit}
        if priority:
            params["priority"] = priority

        data = self._get("/dna/intent/api/v1/issues", params=params)
        raw_issues = data.get("response", [])
        return [CccIssue.model_validate(issue) for issue in raw_issues]

    # ── IPAM / IP Pool API ────────────────────────────────────────────────

    def get_ip_pools(self) -> list[IpPool]:
        """
        Fetches all IP pools from CCC IPAM.
        GET /dna/intent/api/v1/ipam/ip-pool
        """
        if self.auth.is_demo_mode:
            return self._demo_ip_pools()

        data = self._get("/dna/intent/api/v1/ipam/ip-pool")
        raw_pools = data.get("response", [])
        return [IpPool.model_validate(pool) for pool in raw_pools]

    # ── Report Execution API ──────────────────────────────────────────────

    def trigger_report(self, payload: dict) -> ReportStatus:
        """
        Triggers asynchronous report generation.
        POST /dna/intent/api/v1/reports/executions
        """
        if self.auth.is_demo_mode:
            return ReportStatus(
                execution_id=f"demo-{uuid.uuid4().hex[:8]}",
                report_type=payload.get("name", "Unknown"),
                status="IN_PROGRESS",
                message="Demo mode — report generation simulated.",
            )

        data = self._post("/dna/intent/api/v1/reports/executions", json_body=payload)
        return ReportStatus(
            execution_id=data.get("executionId", ""),
            report_type=payload.get("name", "Unknown"),
            status="IN_PROGRESS",
            message=f"Report queued. Execution ID: {data.get('executionId', '')}",
        )

    # ── Remediation Execution ─────────────────────────────────────────────

    def execute_remediation(self, proposal: RemediationProposal) -> ExecutionResult:
        """
        Executes a user-approved remediation payload against CCC.
        """
        if self.auth.is_demo_mode:
            return ExecutionResult(
                proposal_id=proposal.proposal_id,
                success=True,
                ccc_response_code=200,
                ccc_response_body={"message": "Demo mode — remediation simulated."},
                message="Remediation executed successfully (demo).",
            )

        method = proposal.api_method.upper()
        try:
            if method == "POST":
                resp = self._raw_request("POST", proposal.api_endpoint, json_body=proposal.api_body)
            elif method == "PUT":
                resp = self._raw_request("PUT", proposal.api_endpoint, json_body=proposal.api_body)
            elif method == "DELETE":
                resp = self._raw_request("DELETE", proposal.api_endpoint)
            else:
                resp = self._raw_request("GET", proposal.api_endpoint)

            return ExecutionResult(
                proposal_id=proposal.proposal_id,
                success=200 <= resp.status_code < 300,
                ccc_response_code=resp.status_code,
                ccc_response_body=resp.json() if resp.text else {},
                message="Remediation executed." if resp.ok else f"CCC returned {resp.status_code}.",
            )
        except Exception as exc:
            return ExecutionResult(
                proposal_id=proposal.proposal_id,
                success=False,
                ccc_response_code=0,
                message=f"Execution failed: {exc}",
            )

    # ── Core HTTP methods ─────────────────────────────────────────────────

    def _get(self, path: str, params: dict = None, timeout: int = _DEFAULT_TIMEOUT) -> dict:
        resp = self._raw_request("GET", path, params=params, timeout=timeout)
        return resp.json()

    def _post(self, path: str, json_body: dict = None, timeout: int = _DEFAULT_TIMEOUT) -> dict:
        resp = self._raw_request("POST", path, json_body=json_body, timeout=timeout)
        return resp.json()

    def _raw_request(
        self,
        method: str,
        path: str,
        params: dict = None,
        json_body: dict = None,
        timeout: int = _DEFAULT_TIMEOUT,
    ) -> requests.Response:
        """
        Executes an authenticated HTTP request against CCC.
        Handles token refresh on 401, rate limits on 429.
        """
        url = f"{self.base_url}{path}"
        headers = self.auth.get_auth_headers()

        try:
            resp = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=json_body,
                verify=self.verify_ssl,
                timeout=timeout,
            )
        except ReqTimeout:
            raise CCCTimeoutError(f"Request to {path} timed out after {timeout}s.")
        except ReqConnectionError:
            raise CCCConnectionError(f"Cannot connect to CCC at {self.base_url}.")

        # Token expired mid-session → refresh and retry once
        if resp.status_code == 401:
            logger.warning("CCC 401 — token expired. Refreshing …")
            self.auth.invalidate()
            headers = self.auth.get_auth_headers()
            resp = requests.request(
                method=method,
                url=url,
                headers=headers,
                params=params,
                json=json_body,
                verify=self.verify_ssl,
                timeout=timeout,
            )

        if resp.status_code == 429:
            retry_after = int(resp.headers.get("Retry-After", 60))
            raise CCCRateLimitError(retry_after=retry_after)

        if resp.status_code >= 400:
            raise CCCApiError(
                f"CCC API error {resp.status_code} on {method} {path}: {resp.text[:300]}",
                status_code=resp.status_code,
                response_body=resp.json() if resp.text else {},
            )

        return resp

    # ── Demo Data ─────────────────────────────────────────────────────────

    @staticmethod
    def _demo_issues() -> list[CccIssue]:
        """Returns realistic demo issues when no CCC instance is configured."""
        now_ts = int(datetime.now(timezone.utc).timestamp() * 1000)
        return [
            CccIssue.model_validate({
                "issueId": "DEMO-ISSUE-001",
                "issueName": "PoE Controller Error on Switch-Floor3",
                "issueDescription": "Power over Ethernet controller on Gi1/0/14 entered error-disabled state. Connected AP (AP-3F-CONF-01) lost power.",
                "issueSeverity": "P1",
                "issuePriority": "CRITICAL",
                "issueCategory": "Availability",
                "issueEntityType": "Switch Port",
                "issueEntityValue": "Switch-Floor3 / Gi1/0/14",
                "issueSource": "CCC Event Correlation",
                "issueStatus": "active",
                "suggestedActions": [
                    "Check PoE budget on Switch-Floor3",
                    "Verify AP power requirements (802.3at vs 802.3bt)",
                    "Run 'show power inline Gi1/0/14 detail' on the switch",
                ],
                "issueTimestamp": now_ts,
            }),
            CccIssue.model_validate({
                "issueId": "DEMO-ISSUE-002",
                "issueName": "MAC Flapping Detected on VLAN 100",
                "issueDescription": "MAC address aa:bb:cc:dd:ee:ff is flapping between Gi1/0/5 and Gi1/0/12 on Core-Switch-1. This indicates a Layer 2 loop or a misconfigured etherchannel.",
                "issueSeverity": "P2",
                "issuePriority": "HIGH",
                "issueCategory": "Connected",
                "issueEntityType": "VLAN",
                "issueEntityValue": "VLAN 100 / Core-Switch-1",
                "issueSource": "CCC Event Correlation",
                "issueStatus": "active",
                "suggestedActions": [
                    "Check Spanning Tree topology on VLAN 100",
                    "Verify EtherChannel configuration on both uplinks",
                    "Run 'show mac address-table notifications' for flap history",
                ],
                "issueTimestamp": now_ts - 3600000,
            }),
            CccIssue.model_validate({
                "issueId": "DEMO-ISSUE-003",
                "issueName": "High Channel Utilization on AP-2F-OPEN-03 (5GHz)",
                "issueDescription": "5GHz radio on AP-2F-OPEN-03 is reporting 87% channel utilization on channel 36. This exceeds the 70% threshold and indicates RF contention.",
                "issueSeverity": "P3",
                "issuePriority": "MEDIUM",
                "issueCategory": "Performance",
                "issueEntityType": "Access Point",
                "issueEntityValue": "AP-2F-OPEN-03 / Radio 1 (5GHz)",
                "issueSource": "CCC Assurance",
                "issueStatus": "active",
                "suggestedActions": [
                    "Enable RRM DCA on the 5GHz band",
                    "Check for co-channel interference from neighboring APs",
                    "Consider enabling FRA (Flexible Radio Assignment)",
                ],
                "issueTimestamp": now_ts - 7200000,
            }),
        ]

    @staticmethod
    def _demo_ip_pools() -> list[IpPool]:
        """Returns realistic demo IP pools."""
        return [
            IpPool.model_validate({
                "id": "pool-corp-01",
                "ipPoolName": "Corporate-Wireless",
                "ipPoolType": "Generic",
                "ipPoolCidr": "10.10.0.0/22",
                "gateways": "10.10.0.1",
                "totalIpAddressCount": 1022,
                "usedIpAddressCount": 876,
                "freeIpAddressCount": 146,
                "dhcpServerIps": ["10.1.1.10"],
                "dnsServerIps": ["10.1.1.11", "10.1.1.12"],
            }),
            IpPool.model_validate({
                "id": "pool-guest-01",
                "ipPoolName": "Guest-WiFi",
                "ipPoolType": "Generic",
                "ipPoolCidr": "172.16.0.0/23",
                "gateways": "172.16.0.1",
                "totalIpAddressCount": 510,
                "usedIpAddressCount": 120,
                "freeIpAddressCount": 390,
                "dhcpServerIps": ["172.16.0.1"],
                "dnsServerIps": ["8.8.8.8", "8.8.4.4"],
            }),
            IpPool.model_validate({
                "id": "pool-iot-01",
                "ipPoolName": "IoT-Sensors",
                "ipPoolType": "Generic",
                "ipPoolCidr": "192.168.100.0/24",
                "gateways": "192.168.100.1",
                "totalIpAddressCount": 254,
                "usedIpAddressCount": 241,
                "freeIpAddressCount": 13,
                "dhcpServerIps": ["192.168.100.1"],
                "dnsServerIps": ["10.1.1.11"],
            }),
        ]
