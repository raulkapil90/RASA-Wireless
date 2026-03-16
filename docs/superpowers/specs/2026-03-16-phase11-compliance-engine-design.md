# Phase 11: Enterprise Multi-Vendor Compliance Engine — Design Spec

**Date:** 2026-03-16  
**Status:** Approved for Implementation

## Goal

Build a Real-Time, Multi-Vendor Compliance and Governance Engine that continuously monitors configuration drift across Cisco IOS-XE, Palo Alto PAN-OS, and Arista EOS devices. When a violation is detected, the system creates a Human-In-The-Loop (HITL) remediation proposal for admin approval. A Governance Dashboard will provide the fleet-wide "Compliance Health Score".

---

## Architecture

### Data Ingestion: Real-Time Syslog/gNMI Streaming

A lightweight Syslog UDP receiver (port 514) runs as a FastAPI background task. Each `%SYS-5-CONFIG_I` (Cisco), `SYSTEM_LOG` (Palo Alto), or EOS telemetry event triggers an on-demand config audit. gNMI streaming telemetry can be used for Arista/Cisco devices supporting native YANG models.

### Compliance Rule Engine: YAML-Driven Multi-Vendor Rules

Rules are stored as YAML files under `backend/compliance/rules/`. Each rule specifies:
- `id`: Unique rule ID (e.g., `SEC-001`)
- `standard`: Regulatory standard (PCI-DSS, NIST-800-53, CIS)
- `vendors`: List of affected vendors (`["cisco", "arista", "palo_alto"]`)
- `description`: Human-readable rule description
- `audit_fn`: Python function identifier to evaluate compliance
- `remediation_template`: CLI or API command to fix the violation

### HITL Governance Remediation Flow

1. Rule violation detected → `ComplianceViolation` DB record created
2. FastAPI creates a `RemediationProposal` (reusing existing `proposal.py` logic)
3. Frontend Governance Dashboard shows violation with severity badge
4. Admin clicks **[Approve Fix]** → backend calls vendor-specific remediation executor
5. Device config re-audited → Compliance Score updated

---

## Components

### Backend — New Files

| File | Responsibility |
|------|---------------|
| `backend/compliance/__init__.py` | Package init |
| `backend/compliance/syslog_receiver.py` | Async UDP syslog listener (port 514) |
| `backend/compliance/audit_engine.py` | Multi-vendor rule evaluation loop |
| `backend/compliance/rule_loader.py` | YAML rule parser and manager |
| `backend/compliance/models.py` | Pydantic + SQLAlchemy models (`ComplianceViolation`, `ComplianceRule`) |
| `backend/compliance/rules/cisco_iosxe.yaml` | Cisco hardening rules (SSH, telnet, AAA, NTP) |
| `backend/compliance/rules/palo_alto.yaml` | Palo Alto hardening rules (Zones, App-ID, threat profiles) |
| `backend/compliance/rules/arista_eos.yaml` | Arista hardening rules (RBAC, gNMI auth, ACLs) |
| `backend/routers/compliance.py` | FastAPI router (violations, proposals, health score) |

### Backend — Modified Files

| File | Change |
|------|--------|
| `backend/main.py` | Mount compliance router, start syslog receiver on startup |
| `backend/db/models.py` | Add `ComplianceViolation` model |
| `backend/db/schemas.py` | Add Pydantic schemas for violations |
| `backend/requirements.txt` | No new deps (pure stdlib UDP, existing SQLAlchemy) |

### Frontend — New Files

| File | Responsibility |
|------|---------------|
| `src/pages/Compliance.jsx` | Governance Dashboard (Fleet Health Score, Violations List, HITL modal) |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `src/App.jsx` | Add `/compliance` route |
| `src/components/Layout.jsx` | Add sidebar nav link for Compliance |
| `src/pages/Dashboard.jsx` | Add Compliance ServiceCard |

---

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/compliance/violations` | List active violations |
| `GET` | `/compliance/score` | Fleet-wide health score (0-100) |
| `POST` | `/compliance/violations/{id}/propose` | Generate HITL remediation proposal |
| `POST` | `/compliance/violations/{id}/approve` | Approve & execute fix |
| `GET` | `/compliance/rules` | List all active rules |

---

## Verification Plan

1. Start the FastAPI backend and verify the compliance router mounts at `/compliance`.
2. Use netcat to send a mock syslog message (`%SYS-5-CONFIG_I`) and verify a `ComplianceViolation` is created in the DB.
3. Open Governance Dashboard and verify the Fleet Health Score renders.
4. Approve a HITL proposal via the UI and verify the status updates to `resolved`.
5. Run `vite build` — zero errors.
