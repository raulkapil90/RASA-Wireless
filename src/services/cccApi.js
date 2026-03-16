/**
 * CCC API Client — Frontend service layer for Catalyst Center endpoints.
 * All requests go to the FastAPI backend, which proxies to CCC.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function apiFetch(path, options = {}) {
    const url = `${API_BASE}${path}`;
    const resp = await fetch(url, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
    });
    if (!resp.ok) {
        const error = await resp.json().catch(() => ({ detail: resp.statusText }));
        throw new Error(error.detail || `API error: ${resp.status}`);
    }
    return resp.json();
}

// ── Issues ────────────────────────────────────────────────────────────────

export async function fetchIssues(priority = null, limit = 25) {
    const params = new URLSearchParams({ limit });
    if (priority) params.set('priority', priority);
    return apiFetch(`/ccc/issues?${params}`);
}

// ── IPAM Forecast ─────────────────────────────────────────────────────────

export async function fetchIpamForecast() {
    return apiFetch('/ccc/ipam/forecast');
}

// ── Reports ───────────────────────────────────────────────────────────────

export async function generateReport(reportType, timeRangeHours = 24, siteId = null) {
    return apiFetch('/ccc/reports', {
        method: 'POST',
        body: JSON.stringify({
            report_type: reportType,
            time_range_hours: timeRangeHours,
            site_id: siteId,
        }),
    });
}

// ── HITL Remediation ──────────────────────────────────────────────────────

export async function proposeRemediation(issueId) {
    return apiFetch(`/ccc/remediate/propose?issue_id=${encodeURIComponent(issueId)}`, {
        method: 'POST',
    });
}

export async function approveRemediation(proposalId) {
    return apiFetch(`/ccc/remediate/approve/${encodeURIComponent(proposalId)}`, {
        method: 'POST',
    });
}

export async function executeRemediation(proposalId) {
    return apiFetch(`/ccc/remediate/execute/${encodeURIComponent(proposalId)}`, {
        method: 'POST',
    });
}

// ── Webhook Insights ──────────────────────────────────────────────────────

export async function fetchInsights(limit = 20) {
    return apiFetch(`/webhooks/ccc/insights?limit=${limit}`);
}

// ── Health Check ──────────────────────────────────────────────────────────

export async function fetchHealth() {
    return apiFetch('/health');
}
