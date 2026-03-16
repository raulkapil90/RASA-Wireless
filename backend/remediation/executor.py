"""
Remediation — Executor
========================
Executes user-approved remediation payloads against CCC.
This module is the ONLY place where write operations are performed
against the Cisco Catalyst Center API.

Safety guarantees:
  • Proposal must exist and not be expired
  • Proposal must be explicitly marked as approved
  • Execution is logged with full audit trail
"""

import logging
from datetime import datetime, timezone

from ..ccc.client import CccClient
from ..ccc.models import ExecutionResult
from .proposal import get_proposal, is_proposal_valid

logger = logging.getLogger(__name__)


def execute_approved(proposal_id: str, client: CccClient) -> ExecutionResult:
    """
    Executes a previously approved remediation proposal.

    Validates:
    1. Proposal exists
    2. Proposal hasn't expired
    3. Proposal has been approved by the user
    """
    proposal = get_proposal(proposal_id)

    # ── Guard: Does it exist? ─────────────────────────────────────────
    if not proposal:
        return ExecutionResult(
            proposal_id=proposal_id,
            success=False,
            ccc_response_code=0,
            message=f"Remediation proposal '{proposal_id}' not found. It may have expired.",
        )

    # ── Guard: Has it expired? ────────────────────────────────────────
    if not is_proposal_valid(proposal):
        return ExecutionResult(
            proposal_id=proposal_id,
            success=False,
            ccc_response_code=0,
            message=(
                f"Remediation proposal '{proposal_id}' expired at "
                f"{proposal.expires_at.isoformat()}. Please re-propose."
            ),
        )

    # ── Guard: Has user approved? ─────────────────────────────────────
    if not proposal.approved:
        return ExecutionResult(
            proposal_id=proposal_id,
            success=False,
            ccc_response_code=0,
            message="Remediation not yet approved. Call the approve endpoint first.",
        )

    # ── Execute ───────────────────────────────────────────────────────
    logger.info(
        "EXECUTING REMEDIATION %s | Issue: %s | Endpoint: %s %s | Risk: %s",
        proposal_id,
        proposal.issue_id,
        proposal.api_method,
        proposal.api_endpoint,
        proposal.risk_level.value,
    )

    result = client.execute_remediation(proposal)

    # Audit log
    if result.success:
        logger.info(
            "✅ Remediation %s SUCCEEDED | CCC returned %d",
            proposal_id,
            result.ccc_response_code,
        )
    else:
        logger.error(
            "❌ Remediation %s FAILED | CCC returned %d | %s",
            proposal_id,
            result.ccc_response_code,
            result.message,
        )

    return result
