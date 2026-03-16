"""
Webhook — FastAPI Router
==========================
Receives inbound CCC Event Notifications via POST webhook.
Validates optional HMAC signature, stores events in a ring buffer,
and translates them into Narrative Intelligence insights.
"""

import hashlib
import hmac
import logging
import os
from collections import deque
from datetime import datetime, timezone

from fastapi import APIRouter, Header, HTTPException, Request

from .narrative import translate_issue
from ..ccc.models import NarrativeInsight

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Webhooks"])

# ── In-memory event store (ring buffer, last 100 events) ──────────────────

_EVENT_BUFFER: deque[dict] = deque(maxlen=100)
_INSIGHT_BUFFER: deque[NarrativeInsight] = deque(maxlen=100)


# ── Webhook endpoint ─────────────────────────────────────────────────────────


@router.post("/ccc/events", status_code=202)
async def receive_ccc_event(
    request: Request,
    x_ccc_signature: str = Header(None, alias="X-CCC-Signature"),
):
    """
    Receives a CCC Event Notification webhook.

    - Validates HMAC-SHA256 signature if CCC_WEBHOOK_SECRET is configured.
    - Stores raw event in ring buffer.
    - Translates to NarrativeInsight and stores that too.
    - Returns 202 Accepted immediately (async processing).
    """
    # Read raw body
    body = await request.body()

    # ── HMAC Validation ──────────────────────────────────────────────────
    webhook_secret = os.getenv("CCC_WEBHOOK_SECRET", "")
    if webhook_secret and x_ccc_signature:
        expected = hmac.new(
            webhook_secret.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(expected, x_ccc_signature):
            logger.warning("Webhook HMAC mismatch — rejecting event.")
            raise HTTPException(status_code=403, detail="Invalid webhook signature.")

    # ── Parse & Store ────────────────────────────────────────────────────
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload.")

    # CCC may send a single event or a list
    events = payload if isinstance(payload, list) else [payload]

    insights = []
    for event in events:
        event["_received_at"] = datetime.now(timezone.utc).isoformat()
        _EVENT_BUFFER.append(event)

        insight = translate_issue(event)
        _INSIGHT_BUFFER.append(insight)
        insights.append(insight.model_dump())

        logger.info(
            "Webhook received: [%s] %s — %s",
            insight.severity,
            insight.event_id,
            insight.plain_english_summary[:80],
        )

    return {
        "status": "accepted",
        "events_processed": len(events),
        "insights": insights,
    }


# ── Query endpoints ──────────────────────────────────────────────────────────


@router.get("/ccc/events")
async def list_recent_events(limit: int = 20):
    """Returns the most recent raw webhook events."""
    items = list(_EVENT_BUFFER)[-limit:]
    items.reverse()
    return {"events": items, "total": len(_EVENT_BUFFER)}


@router.get("/ccc/insights")
async def list_recent_insights(limit: int = 20):
    """Returns the most recent Narrative Intelligence insights."""
    items = [i.model_dump() for i in list(_INSIGHT_BUFFER)[-limit:]]
    items.reverse()
    return {"insights": items, "total": len(_INSIGHT_BUFFER)}
