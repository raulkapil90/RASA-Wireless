"""
RASA NetOps AI — Consensus Engine (Groq Turbo Edition)
======================================================
All-Groq pipeline for maximum speed:
  Analyst #1 : Groq Llama-3.3-70B (Client/802.11 focus)
  Analyst #2 : Groq Llama-3.3-70B (Infrastructure/AP focus)
  Synthesizer: Groq Llama-3.3-70B (Consensus JSON builder)

Total pipeline time: ~5–8 seconds.
"""

import os
import json
import logging
import asyncio
from typing import Any, Dict, List, Optional

from . import config

logger = logging.getLogger(__name__)

# ── Provider availability check (runs once at import time) ────────────────
# Warns for missing optional keys; never raises. System works with Groq alone.

def _check_providers() -> Dict[str, bool]:
    available = {}
    providers = {
        "groq": config.GROQ_API_KEY,
        "openai": config.OPENAI_API_KEY,
        "anthropic": config.ANTHROPIC_API_KEY,
        "gemini": config.GEMINI_API_KEY,
    }
    for name, key in providers.items():
        if key:
            available[name] = True
        else:
            logger.warning(
                "LLM provider '%s' disabled — %s_API_KEY not set. "
                "Skipping gracefully.",
                name, name.upper()
            )
            available[name] = False
    return available

PROVIDERS = _check_providers()

# ── Analyst Prompt #1: Client/Wireless Focus ──────────────────────────────────

ANALYST_CLIENT_PROMPT = """You are a CCIE Wireless expert specializing in CLIENT-SIDE 802.11 analysis on Cisco C9800 WLC (IOS-XE 17.x).

Focus on:
- Client state machine transitions (S_CO_ASSOCIATING, AUTH_IN_PROGRESS, RUN, etc.)
- Deauth/disassoc reason codes (interpret them precisely)
- EAP/802.1X authentication phases
- 4-way handshake failures
- SAE/OWE handshake failures
- Roaming events (fast roam, PMKID, FT)
- Client RSSI/SNR issues

Rules: No templates. Be precise. Cite exact log lines. Plain text output only.
"""

# ── Analyst Prompt #2: Infrastructure/AP Focus ────────────────────────────────

ANALYST_INFRA_PROMPT = """You are a CCIE Wireless expert specializing in INFRASTRUCTURE analysis on Cisco C9800 WLC (IOS-XE 17.x).

Focus on:
- CAPWAP/DTLS tunnel issues between AP and WLC
- AP join failures and image download errors
- VLAN assignment and flex-connect issues
- RRM events (radar, DFS, channel changes)
- Site-manager errors and policy application
- AAA/RADIUS server communication
- DHCP snooping and IP assignment

Rules: No templates. Be precise. Cite exact log lines. Plain text output only.
"""

# ── Synthesizer Prompt ────────────────────────────────────────────────────────

SYNTHESIZER_PROMPT = """You are the RASA NetOps Consensus Engine.

Given two independent analyses of the same Cisco WLC logs (one focused on client-side issues, one on infrastructure), produce ONE authoritative JSON array.

Rules:
1. Merge insights from both analysts into unified findings.
2. Drop generic advice unless the log directly supports it.
3. Contradictions: the raw log is ground truth.
4. Each distinct failure = separate JSON object.
5. Normal/healthy logs = one info finding saying "No issues detected."

Output ONLY a raw JSON array. Start with `[`, end with `]`. No other text.

Schema per object (ALL fields required):
{
  "title": "Short finding title",
  "severity": "critical | high | warning | medium | info | low",
  "category": "AUTH_FAILURE | JOIN_FAILURE | CLIENT_ISSUE | RF_EVENT | NETWORK_EVENT | UNKNOWN_ERR | KNOWN_CAVEAT | GENERAL",
  "confidence": 90,
  "phase": "802.11 phase name",
  "diagnosis": "Precise 1-2 sentence root cause.",
  "evidence": "Exact log line(s).",
  "remediation": ["Step 1: ...", "Step 2: ..."],
  "proTip": "Expert tip.",
  "consensus": {"agreement": "high | medium | low", "note": "What both analysts agreed on."},
  "advancedReason": {
    "fault": "Mechanism of failure.",
    "impact": [{"label": "Layer", "status": "ok | warning | error", "value": "Detail"}]
  }
}
"""

# ── Groq async call ───────────────────────────────────────────────────────────

async def _groq_call(system: str, user: str, max_tokens: int = 2000) -> str:
    if not PROVIDERS.get("groq"):
        raise RuntimeError("GROQ_API_KEY not configured.")
    from groq import AsyncGroq
    client = AsyncGroq(api_key=config.GROQ_API_KEY)
    resp = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        temperature=0.1,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user}
        ]
    )
    return resp.choices[0].message.content.strip()

# ── Analysts ──────────────────────────────────────────────────────────────────

async def _analyst_client(logs: str) -> Optional[str]:
    """Analyst #1: Client/802.11 focus"""
    try:
        r = await _groq_call(ANALYST_CLIENT_PROMPT, f"Analyze:\n<logs>\n{logs}\n</logs>")
        logger.info("Analyst #1 (Client) done.")
        return f"[ANALYST: CLIENT/802.11]\n{r}"
    except Exception as e:
        logger.error(f"Client analyst failed: {e}")
        return None

async def _analyst_infra(logs: str) -> Optional[str]:
    """Analyst #2: Infrastructure/AP focus"""
    try:
        r = await _groq_call(ANALYST_INFRA_PROMPT, f"Analyze:\n<logs>\n{logs}\n</logs>")
        logger.info("Analyst #2 (Infra) done.")
        return f"[ANALYST: INFRASTRUCTURE]\n{r}"
    except Exception as e:
        logger.error(f"Infra analyst failed: {e}")
        return None

# ── Synthesizer ───────────────────────────────────────────────────────────────

async def _synthesize(logs: str, analyses: List[str]) -> List[Dict[str, Any]]:
    block = "\n\n---\n\n".join(analyses)
    msg = (
        f"RAW LOGS:\n<logs>\n{logs}\n</logs>\n\n"
        f"ANALYSES:\n{block}\n\n"
        f"Output ONLY the JSON array. Start with `[`."
    )
    try:
        raw = await _groq_call(SYNTHESIZER_PROMPT, msg, max_tokens=3000)
        logger.info(f"Synthesizer done. First 200 chars: {raw[:200]}")

        # Clean markdown fences if present
        if "```json" in raw:
            raw = raw.split("```json")[1].split("```")[0]
        elif "```" in raw:
            raw = raw.split("```")[1].split("```")[0]
        raw = raw.strip()

        # Find the JSON array start
        idx = raw.find("[")
        if idx > 0:
            raw = raw[idx:]

        findings = json.loads(raw)
        return findings if isinstance(findings, list) else [findings]

    except json.JSONDecodeError as e:
        logger.error(f"Parse error: {e}\nRaw: {raw[:500]}")
        return [_err("Parse Error", "Synthesizer returned malformed JSON. Please try again.")]
    except Exception as e:
        logger.error(f"Synthesizer failed: {e}")
        return [_err("Synthesis Failed", str(e))]

# ── Main entry point ──────────────────────────────────────────────────────────

async def consensus_analyze(log_data: str) -> List[Dict[str, Any]]:
    if not log_data or not log_data.strip():
        return [_err("No Input", "Paste syslogs or radioactive trace.", severity="info", category="GENERAL")]

    if not PROVIDERS.get("groq"):
        return [_err(
            "GROQ_API_KEY Missing",
            "Add GROQ_API_KEY to .env (free at console.groq.com)."
        )]

    active = [name for name, ok in PROVIDERS.items() if ok]
    logger.info("Consensus Engine: Dual-analyst fan-out. Active providers: %s", active)

    # FAN-OUT: both analysts run simultaneously (~1-2s each)
    results = await asyncio.gather(
        _analyst_client(log_data),
        _analyst_infra(log_data),
        return_exceptions=False
    )

    analyses = [r for r in results if r is not None]
    if not analyses:
        return [_err("Analysis Failed", "Both analysts returned errors.")]

    logger.info(f"{len(analyses)} analyst(s) done. Synthesizing...")

    # FAN-IN: Groq synthesizer (~1-2s)
    return await _synthesize(log_data, analyses)


def analyze_syslogs(log_data: str) -> List[Dict[str, Any]]:
    """Sync wrapper."""
    try:
        return asyncio.run(consensus_analyze(log_data))
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        return loop.run_until_complete(consensus_analyze(log_data))

# ── Error helper ──────────────────────────────────────────────────────────────

def _err(title: str, detail: str, severity: str = "critical", category: str = "UNKNOWN_ERR"):
    return {
        "title": title,
        "severity": severity,
        "category": category,
        "confidence": 0,
        "phase": "AI Inference",
        "diagnosis": detail,
        "evidence": detail,
        "remediation": [
            "Ensure GROQ_API_KEY is set in your .env file (free at console.groq.com).",
            "Optionally add OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY for additional providers.",
            "Restart the backend after adding keys."
        ],
        "consensus": {"agreement": "N/A", "note": "Error during analysis."}
    }
