"""Audit engine: evaluates device configs against YAML compliance rules."""
import re
import logging
from typing import List, Dict, Any
from backend.compliance.rule_loader import load_rules

logger = logging.getLogger("audit_engine")


def audit_config(device_id: str, hostname: str, vendor: str, config_text: str) -> List[Dict[str, Any]]:
    """
    Evaluate a device's config text against all applicable vendor rules.
    Returns a list of violation dicts for rules that failed.
    """
    rules = load_rules(vendor)
    violations = []

    for rule in rules:
        violated = False

        # pattern: the config should NOT contain this string
        if "pattern" in rule:
            try:
                if re.search(rule["pattern"], config_text, re.IGNORECASE | re.MULTILINE):
                    violated = True
            except re.error:
                if rule["pattern"] in config_text:
                    violated = True

        # pattern_missing: this string MUST exist in the config
        if "pattern_missing" in rule and not violated:
            try:
                if not re.search(rule["pattern_missing"], config_text, re.IGNORECASE | re.MULTILINE):
                    violated = True
            except re.error:
                if rule["pattern_missing"] not in config_text:
                    violated = True

        if violated:
            logger.info(f"Violation: {rule['id']} on {hostname}")
            violations.append({
                "device_id": device_id,
                "device_hostname": hostname,
                "vendor": vendor,
                "rule_id": rule["id"],
                "rule_description": rule["description"],
                "severity": rule.get("severity", "MEDIUM"),
                "remediation_cmd": rule.get("remediation_template"),
            })

    return violations


def save_violations(violations: List[Dict[str, Any]], db) -> int:
    """
    Persist new violations to the database.
    Skips violations already recorded as open for the same device+rule.
    Returns the count of new violations saved.
    """
    from backend.db.models import ComplianceViolation

    saved = 0
    for v in violations:
        existing = db.query(ComplianceViolation).filter_by(
            device_id=v["device_id"], rule_id=v["rule_id"], status="open"
        ).first()
        if not existing:
            db.add(ComplianceViolation(**v))
            saved += 1
    db.commit()
    return saved
