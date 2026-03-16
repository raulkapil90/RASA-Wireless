"""
Reports — Parameterized Contextual Reporting Engine
=====================================================
Maps user-selected report types (slots) to CCC report API payloads
and triggers asynchronous report generation.
"""

import logging
from typing import Optional

from ..ccc.client import CccClient
from ..ccc.models import ReportCategory, ReportRequest, ReportStatus

logger = logging.getLogger(__name__)


# ── Report Templates ──────────────────────────────────────────────────────────
# Each template maps a user-friendly report type to the exact CCC API payload.

_REPORT_TEMPLATES: dict[str, dict] = {
    ReportCategory.WIRELESS_INTERFERENCE: {
        "name": "Wireless Interference Assessment",
        "description": "RF interference sources, co-channel interference metrics, and non-WiFi interference detected across all APs.",
        "reportCategory": "Wireless",
        "viewGroupId": "wireless_rf_report",
        "dataCategory": [
            {"name": "Channel Utilization"},
            {"name": "Interference Power"},
            {"name": "Non-WiFi Interference"},
            {"name": "Co-Channel Interference"},
        ],
    },
    ReportCategory.TOP_TALKERS: {
        "name": "Top Talkers Analysis",
        "description": "Top bandwidth consumers by client, application, and SSID over the selected time range.",
        "reportCategory": "Client",
        "viewGroupId": "client_top_talkers",
        "dataCategory": [
            {"name": "Top Clients by Traffic Volume"},
            {"name": "Top Applications"},
            {"name": "Top SSIDs by Client Count"},
        ],
    },
    ReportCategory.CLIENT_HEALTH: {
        "name": "Client Health Summary",
        "description": "Overall wireless client health, onboarding success rates, RSSI distribution, and roaming analytics.",
        "reportCategory": "Client",
        "viewGroupId": "client_health_report",
        "dataCategory": [
            {"name": "Client Health Score"},
            {"name": "Onboarding Time"},
            {"name": "RSSI Distribution"},
            {"name": "Roaming Events"},
        ],
    },
    ReportCategory.NETWORK_HEALTH: {
        "name": "Network Health Dashboard",
        "description": "End-to-end network health including wired, wireless, and WAN segments.",
        "reportCategory": "Network",
        "viewGroupId": "network_health_report",
        "dataCategory": [
            {"name": "Network Health Score"},
            {"name": "Device Reachability"},
            {"name": "Interface Errors"},
        ],
    },
    ReportCategory.AP_PERFORMANCE: {
        "name": "AP Performance Analysis",
        "description": "Access Point performance metrics including channel utilization, client count, throughput, and airtime fairness.",
        "reportCategory": "Wireless",
        "viewGroupId": "ap_performance_report",
        "dataCategory": [
            {"name": "AP Channel Utilization"},
            {"name": "AP Client Distribution"},
            {"name": "AP Throughput"},
            {"name": "Airtime Fairness Index"},
        ],
    },
}


def generate_report(
    request: ReportRequest,
    client: CccClient,
) -> ReportStatus:
    """
    Generates a CCC report based on the user's selected type and filters.

    This function:
    1. Maps the report_type slot to a CCC API payload template
    2. Injects time range and site filters
    3. Triggers POST /dna/intent/api/v1/reports/executions
    4. Returns immediately with execution_id (report generates async)
    """
    template = _REPORT_TEMPLATES.get(request.report_type)
    if not template:
        return ReportStatus(
            execution_id="",
            report_type=request.report_type.value,
            status="FAILED",
            message=f"Unknown report type: {request.report_type.value}. "
                    f"Available: {', '.join(r.value for r in ReportCategory)}",
        )

    # Build the full API payload
    payload = {
        **template,
        "schedule": {
            "type": "ONETIME",
        },
        "deliveries": [],  # No email delivery — user downloads from CCC
    }

    # Inject time range
    if request.time_range_hours:
        payload["timeRange"] = {
            "type": "LAST_N_HOURS",
            "value": request.time_range_hours,
        }

    # Inject site filter
    if request.site_id:
        payload["siteHierarchy"] = request.site_id

    logger.info(
        "Triggering CCC report: %s (time_range=%dh, site=%s)",
        template["name"],
        request.time_range_hours,
        request.site_id or "all",
    )

    try:
        result = client.trigger_report(payload)
        result.report_type = template["name"]
        return result
    except Exception as exc:
        logger.exception("Report generation failed: %s", exc)
        return ReportStatus(
            execution_id="",
            report_type=template["name"],
            status="FAILED",
            message=f"Report generation failed: {exc}",
        )
