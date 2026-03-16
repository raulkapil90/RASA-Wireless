"""
Predictive — IPAM Capacity Forecasting Engine
===============================================
Predicts IP pool exhaustion using linear regression on historical usage.

When fewer than 3 data points exist, falls back to simple ratio-based
estimation. Designed for enterprise environments where DHCP scope
exhaustion is a critical but often invisible failure mode.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from ..ccc.models import IpamForecast, IpPool

logger = logging.getLogger(__name__)

# ── In-memory usage history (pool_id → list of (timestamp, used_count)) ───

_usage_history: dict[str, list[tuple[float, int]]] = {}


def record_snapshot(pool: IpPool):
    """Records a point-in-time usage snapshot for trend analysis."""
    now = datetime.now(timezone.utc).timestamp()
    if pool.id not in _usage_history:
        _usage_history[pool.id] = []

    _usage_history[pool.id].append((now, pool.used_ip_address_count))

    # Keep at most 90 days of daily snapshots (≈90 points)
    if len(_usage_history[pool.id]) > 90:
        _usage_history[pool.id] = _usage_history[pool.id][-90:]


def predict_exhaustion(pool: IpPool) -> IpamForecast:
    """
    Predicts when an IP pool will be fully exhausted.

    Strategy:
      1. If ≥3 historical data points exist → linear regression
      2. If <3 data points → simple ratio-based estimation
      3. If pool is shrinking or stable → report accordingly
    """
    # Record current state
    record_snapshot(pool)

    utilization = pool.utilization_pct
    free = pool.free_ip_address_count
    total = pool.total_ip_address_count
    used = pool.used_ip_address_count

    # Get history for this pool
    history = _usage_history.get(pool.id, [])

    days_to_exhaustion: Optional[float] = None
    trend = "stable"
    confidence = 0.0

    if len(history) >= 3:
        # ── Linear Regression ─────────────────────────────────────────
        days_to_exhaustion, trend, confidence = _linear_regression_forecast(
            history, total
        )
    elif free > 0 and used > 0:
        # ── Simple ratio-based fallback ───────────────────────────────
        # Assume current daily consumption ≈ used / 30 (rough 30-day avg)
        daily_rate = max(used / 30, 1)
        days_to_exhaustion = round(free / daily_rate, 1)
        trend = "growing"
        confidence = 0.3  # low confidence with no history

    # Determine risk level
    risk = _assess_risk(utilization, days_to_exhaustion)

    return IpamForecast(
        pool_name=pool.ip_pool_name,
        pool_cidr=pool.ip_pool_cidr,
        current_utilization_pct=utilization,
        used=used,
        total=total,
        free=free,
        days_to_exhaustion=days_to_exhaustion,
        trend=trend,
        confidence=confidence,
        risk_level=risk,
    )


def predict_all(pools: list[IpPool]) -> list[IpamForecast]:
    """Predicts exhaustion for all pools."""
    return [predict_exhaustion(pool) for pool in pools]


# ─── Private helpers ──────────────────────────────────────────────────────────


def _linear_regression_forecast(
    history: list[tuple[float, int]],
    total: int,
) -> tuple[Optional[float], str, float]:
    """
    Simple linear regression: y = mx + b where x is time and y is used count.
    Returns (days_to_exhaustion, trend, confidence).
    """
    n = len(history)
    if n < 2:
        return None, "stable", 0.0

    # Convert timestamps to days since first observation
    t0 = history[0][0]
    xs = [(ts - t0) / 86400 for ts, _ in history]  # days
    ys = [used for _, used in history]

    # Compute means
    x_mean = sum(xs) / n
    y_mean = sum(ys) / n

    # Compute slope (m) and intercept (b)
    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(xs, ys))
    denominator = sum((x - x_mean) ** 2 for x in xs)

    if denominator == 0:
        return None, "stable", 0.0

    m = numerator / denominator  # slope: addresses consumed per day
    b = y_mean - m * x_mean

    # Determine trend
    if m > 1:
        trend = "growing"
    elif m < -1:
        trend = "shrinking"
    else:
        trend = "stable"

    # Predict days until used == total
    if m <= 0:
        # Pool is shrinking or flat — no exhaustion predicted
        return None, trend, 0.7

    # Current day index
    current_day = xs[-1]
    current_predicted = m * current_day + b
    remaining = total - current_predicted

    if remaining <= 0:
        days_to_exhaustion = 0.0
    else:
        days_to_exhaustion = round(remaining / m, 1)

    # Confidence based on R² (coefficient of determination)
    ss_res = sum((y - (m * x + b)) ** 2 for x, y in zip(xs, ys))
    ss_tot = sum((y - y_mean) ** 2 for y in ys)
    r_squared = 1 - (ss_res / ss_tot) if ss_tot > 0 else 0
    confidence = round(max(0, min(1, r_squared)), 2)

    return days_to_exhaustion, trend, confidence


def _assess_risk(utilization: float, days_to_exhaustion: Optional[float]) -> str:
    """Maps utilization + forecast to a risk level."""
    if utilization >= 95 or (days_to_exhaustion is not None and days_to_exhaustion <= 3):
        return "CRITICAL"
    if utilization >= 85 or (days_to_exhaustion is not None and days_to_exhaustion <= 14):
        return "HIGH"
    if utilization >= 70 or (days_to_exhaustion is not None and days_to_exhaustion <= 30):
        return "MEDIUM"
    return "LOW"
