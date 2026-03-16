"""
Remediation — Proposal Builder
================================
Builds typed, human-readable remediation proposals from CCC issues.
Each proposal contains the exact API payload needed to fix the issue,
but does NOT execute it — the user must explicitly approve first.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from ..ccc.models import CccIssue, RemediationProposal, RemediationRisk

logger = logging.getLogger(__name__)

# ── Proposal Store (in-memory, keyed by proposal_id) ─────────────────────
# In production, this would be Redis or a database table.
_proposals: dict[str, RemediationProposal] = {}

# Proposal TTL: user must approve within this window
_PROPOSAL_TTL_MINUTES = 5


# ── Remediation Templates ────────────────────────────────────────────────────

_REMEDIATION_MAP: dict[str, dict] = {
    "poe": {
        "risk": RemediationRisk.MEDIUM,
        "description": "Bounce the affected switch port to recover from err-disabled PoE state.",
        "human_readable": "Shut / No-Shut the switch port {entity} to recover PoE power delivery.",
        "api_endpoint": "/dna/intent/api/v1/interface/{device_id}/{interface}/admin-status",
        "api_method": "PUT",
        "api_body_template": {
            "adminStatus": "UP",
            "description": "RASA-remediated: PoE recovery bounce",
        },
    },
    "mac_flap": {
        "risk": RemediationRisk.HIGH,
        "description": "Enable storm-control and BPDU Guard on the suspected loop port.",
        "human_readable": "Apply storm-control and BPDU Guard on {entity} to contain the L2 loop.",
        "api_endpoint": "/dna/intent/api/v1/template-programmer/template/deploy",
        "api_method": "POST",
        "api_body_template": {
            "templateId": "storm-control-bpdu-guard",
            "targetInfo": [{"type": "MANAGED_DEVICE_IP"}],
        },
    },
    "ap_disconnect": {
        "risk": RemediationRisk.LOW,
        "description": "Request AP rejoin by resetting the CAPWAP tunnel from the WLC.",
        "human_readable": "Reset CAPWAP tunnel for {entity} to force a clean rejoin.",
        "api_endpoint": "/dna/intent/api/v1/device-reboot",
        "api_method": "POST",
        "api_body_template": {
            "deviceIds": [],
            "rebootType": "GracefulReboot",
        },
    },
    "channel_utilization": {
        "risk": RemediationRisk.LOW,
        "description": "Trigger Dynamic Channel Assignment (DCA) to reassign congested channels.",
        "human_readable": "Initiate RRM DCA run to reassign {entity} to a less congested channel.",
        "api_endpoint": "/dna/intent/api/v1/rrm/dca/trigger",
        "api_method": "POST",
        "api_body_template": {
            "apMac": "",
            "band": "5GHz",
        },
    },
    "dhcp": {
        "risk": RemediationRisk.HIGH,
        "description": "Extend the DHCP scope or add a secondary DHCP server to the affected VLAN.",
        "human_readable": "Extend DHCP scope for the pool serving {entity}.",
        "api_endpoint": "/dna/intent/api/v1/ipam/ip-pool",
        "api_method": "PUT",
        "api_body_template": {
            "totalIpAddressCount": 0,  # to be computed
        },
    },
}


def build_remediation(issue: CccIssue) -> RemediationProposal:
    """
    Analyzes a CCC issue and builds a typed remediation proposal.

    The proposal contains:
    - Human-readable description of the fix
    - Risk level
    - Exact API endpoint, method, and body
    - Expiration timestamp (user must approve within TTL)
    """
    # Match issue to a remediation template
    search_text = f"{issue.name} {issue.description} {issue.category}".lower()
    matched_template = None

    for keyword, template in _REMEDIATION_MAP.items():
        if keyword.replace("_", " ") in search_text or keyword in search_text:
            matched_template = template
            break

    if not matched_template:
        # Fallback: generic "investigate" proposal
        matched_template = {
            "risk": RemediationRisk.LOW,
            "description": "No automated remediation available. Manual investigation recommended.",
            "human_readable": f"Investigate {issue.name} on {issue.entity_value} manually via CCC Assurance.",
            "api_endpoint": f"/dna/intent/api/v1/issues/{issue.issue_id}/resolve",
            "api_method": "POST",
            "api_body_template": {"status": "resolved", "notes": "Resolved via RASA HITL workflow."},
        }

    proposal_id = f"rem-{uuid.uuid4().hex[:12]}"
    entity = issue.entity_value or "Unknown Device"

    proposal = RemediationProposal(
        proposal_id=proposal_id,
        issue_id=issue.issue_id,
        issue_name=issue.name,
        description=matched_template["description"],
        risk_level=matched_template["risk"],
        api_endpoint=matched_template["api_endpoint"].format(
            device_id="placeholder",
            interface=entity.split("/")[-1] if "/" in entity else "unknown",
        ),
        api_method=matched_template["api_method"],
        api_body=matched_template["api_body_template"],
        human_readable_action=matched_template["human_readable"].format(entity=entity),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=_PROPOSAL_TTL_MINUTES),
    )

    # Store for later execution
    _proposals[proposal_id] = proposal
    logger.info("Remediation proposal %s created for issue %s (expires %s).",
                proposal_id, issue.issue_id, proposal.expires_at.isoformat())

    return proposal


def get_proposal(proposal_id: str) -> RemediationProposal | None:
    """Retrieves a stored proposal by ID."""
    return _proposals.get(proposal_id)


def is_proposal_valid(proposal: RemediationProposal) -> bool:
    """Checks if a proposal has not expired."""
    return datetime.now(timezone.utc) < proposal.expires_at


def mark_approved(proposal_id: str) -> bool:
    """Marks a proposal as approved. Returns False if expired or not found."""
    proposal = _proposals.get(proposal_id)
    if not proposal:
        return False
    if not is_proposal_valid(proposal):
        logger.warning("Proposal %s expired at %s.", proposal_id, proposal.expires_at)
        return False
    proposal.approved = True
    return True


def cleanup_expired():
    """Removes expired proposals from the store."""
    now = datetime.now(timezone.utc)
    expired = [pid for pid, p in _proposals.items() if now >= p.expires_at]
    for pid in expired:
        del _proposals[pid]
    if expired:
        logger.info("Cleaned up %d expired remediation proposals.", len(expired))
