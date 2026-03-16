"""
Webhook — Narrative Intelligence Engine
=========================================
Translates raw CCC Event Notification JSON into human-readable
"AI Insight" summaries.  This is the cognitive core that eliminates
alert fatigue by converting machine telemetry into actionable English.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from ..ccc.models import NarrativeInsight


# ─── Pattern Library ──────────────────────────────────────────────────────────
# Each entry maps a CCC issue category / keyword to a narrative template.

_NARRATIVE_PATTERNS: list[dict[str, Any]] = [
    {
        "keywords": ["poe", "power over ethernet", "err-disabled", "power budget"],
        "severity": "CRITICAL",
        "template": (
            "🔴 **Power Failure Alert**: {entity} has entered an error-disabled state "
            "due to a PoE controller error. The connected device (likely an AP or IP phone) "
            "has lost power. This typically occurs when the switch port's PoE budget is "
            "exceeded or when the powered device draws more than the port's class allows."
        ),
        "action": (
            "Run 'show power inline {port} detail' on the switch. "
            "Check if the AP requires 802.3bt (PoE++) vs the switch provides 802.3af/at. "
            "Consider 'shutdown / no shutdown' on the port to recover, or redistribute PoE budget."
        ),
    },
    {
        "keywords": ["mac flap", "mac move", "mac address flapping"],
        "severity": "HIGH",
        "template": (
            "🟠 **Layer 2 Loop Detected**: MAC address flapping observed on {entity}. "
            "A MAC address is oscillating between two or more switch ports, which strongly "
            "indicates a spanning-tree misconfiguration, a rogue hub, or a broken etherchannel. "
            "This will cause intermittent connectivity for any device behind the affected ports."
        ),
        "action": (
            "Check Spanning Tree topology: 'show spanning-tree vlan {vlan}'. "
            "Verify EtherChannel bundles: 'show etherchannel summary'. "
            "Enable BPDU Guard on access ports to auto-isolate rogue bridges."
        ),
    },
    {
        "keywords": ["ap disconnect", "ap unreachable", "ap down", "capwap down"],
        "severity": "CRITICAL",
        "template": (
            "🔴 **AP Connectivity Loss**: {entity} has disconnected from the WLC. "
            "Clients previously connected to this AP will experience immediate service loss. "
            "Root causes include PoE failure, uplink switch port down, CAPWAP tunnel failure, "
            "or a physical cable issue."
        ),
        "action": (
            "Verify switch port status: 'show interface {port} status'. "
            "Check PoE status on the switch. "
            "Ping the AP management IP. If unreachable, dispatch field technician. "
            "Check WLC: 'show ap summary | include {ap_name}'."
        ),
    },
    {
        "keywords": ["channel utilization", "airtime", "rf contention", "interference"],
        "severity": "MEDIUM",
        "template": (
            "🟡 **RF Contention Warning**: {entity} is experiencing elevated channel utilization "
            "({detail}). When channel utilization exceeds 70%, clients experience increased "
            "latency and retransmissions. This is NOT a bandwidth problem — it's an airtime "
            "contention problem. More bandwidth won't fix it; fewer devices per channel will."
        ),
        "action": (
            "Enable Dynamic Channel Assignment (DCA) if not active. "
            "Consider Flexible Radio Assignment (FRA) to move radios to less-congested bands. "
            "Audit for co-channel interference: 'show ap auto-rf dot11 5ghz'. "
            "Reduce client density per AP if in a high-density venue."
        ),
    },
    {
        "keywords": ["dhcp", "ip address", "no ip", "dhcp timeout", "dhcp failure"],
        "severity": "HIGH",
        "template": (
            "🟠 **DHCP Failure**: {entity} — Clients are failing to obtain IP addresses. "
            "This typically causes a 'connected but no internet' experience. "
            "The DHCP server may be unreachable, the scope may be exhausted, "
            "or there may be a VLAN/helper-address misconfiguration."
        ),
        "action": (
            "Verify DHCP scope: 'show ip dhcp pool' on the DHCP server. "
            "Check helper-address on the gateway SVI: 'show run int vlan {vlan}'. "
            "Verify L3 reachability between the client VLAN and DHCP server. "
            "Check for rogue DHCP servers with 'show ip dhcp snooping binding'."
        ),
    },
    {
        "keywords": ["authentication", "dot1x", "radius", "aaa failure"],
        "severity": "HIGH",
        "template": (
            "🟠 **Authentication Failure**: {entity} — 802.1X/RADIUS authentication is "
            "failing. Users cannot connect to the secure SSID. This may be caused by "
            "RADIUS server unreachability, certificate issues, or ISE policy mismatches."
        ),
        "action": (
            "Check RADIUS server reachability from the WLC. "
            "Verify shared secret matches between WLC and ISE. "
            "Check ISE Live Logs for the specific failure reason code. "
            "Run 'test aaa group radius <user> <pass> new-code' on the WLC."
        ),
    },
]


# ─── Translation Engine ──────────────────────────────────────────────────────


def translate_issue(raw_event: dict) -> NarrativeInsight:
    """
    Translates a raw CCC event/issue JSON into a human-readable NarrativeInsight.

    The function searches for keyword matches in the issue name, description,
    and category to select the most appropriate narrative template.
    """
    issue_name = raw_event.get("issueName", raw_event.get("name", ""))
    issue_desc = raw_event.get("issueDescription", raw_event.get("description", ""))
    issue_id = raw_event.get("issueId", raw_event.get("eventId", "unknown"))
    entity = raw_event.get("issueEntityValue", raw_event.get("entityValue", "Unknown Device"))
    category = raw_event.get("issueCategory", raw_event.get("category", ""))
    severity = raw_event.get("issueSeverity", raw_event.get("severity", "P4"))
    timestamp_ms = raw_event.get("issueTimestamp", raw_event.get("timestamp", None))

    # Combine all text fields for keyword matching
    search_text = f"{issue_name} {issue_desc} {category}".lower()

    # Find matching pattern
    matched_pattern = None
    for pattern in _NARRATIVE_PATTERNS:
        if any(kw in search_text for kw in pattern["keywords"]):
            matched_pattern = pattern
            break

    # Build the narrative
    if matched_pattern:
        # Extract detail from description (e.g., "87% channel utilization")
        detail_match = re.search(r"(\d+%)", issue_desc)
        detail = detail_match.group(1) if detail_match else "threshold exceeded"

        summary = matched_pattern["template"].format(
            entity=entity,
            detail=detail,
            port=entity.split("/")[-1] if "/" in entity else "unknown",
            vlan=re.search(r"VLAN\s*(\d+)", search_text, re.I).group(1)
            if re.search(r"VLAN\s*(\d+)", search_text, re.I) else "unknown",
            ap_name=entity,
        )
        action = matched_pattern["action"].format(
            port=entity.split("/")[-1] if "/" in entity else "unknown",
            vlan=re.search(r"VLAN\s*(\d+)", search_text, re.I).group(1)
            if re.search(r"VLAN\s*(\d+)", search_text, re.I) else "unknown",
            ap_name=entity,
        )
        nar_severity = matched_pattern["severity"]
    else:
        # Fallback: generic narrative
        summary = (
            f"⚪ **Network Event**: {issue_name or 'Unknown Event'} detected on {entity}. "
            f"Description: {issue_desc or 'No additional details provided by CCC.'}"
        )
        action = (
            "Review the event in Cisco Catalyst Center Assurance dashboard. "
            "Collect 'show logging' from the affected device for deeper analysis."
        )
        nar_severity = _map_ccc_severity(severity)

    # Parse timestamp
    ts = None
    if timestamp_ms:
        try:
            ts = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc)
        except (ValueError, TypeError, OSError):
            ts = datetime.now(timezone.utc)

    # Extract device names from entity/description
    devices = [d.strip() for d in entity.split("/")]

    return NarrativeInsight(
        event_id=issue_id,
        severity=nar_severity,
        plain_english_summary=summary,
        affected_devices=devices,
        suggested_action=action,
        raw_category=category,
        timestamp=ts,
    )


def _map_ccc_severity(ccc_severity: str) -> str:
    """Maps CCC severity codes (P1-P4) to human labels."""
    mapping = {
        "P1": "CRITICAL",
        "P2": "HIGH",
        "P3": "MEDIUM",
        "P4": "LOW",
    }
    return mapping.get(ccc_severity, "LOW")
