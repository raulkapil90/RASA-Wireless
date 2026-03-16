import React, { useState, useEffect, useCallback } from 'react';
import {
    ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Clock,
    RefreshCw, ChevronRight, Terminal, Cpu, Wifi, Server, X
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const SEVERITY_CONFIG = {
    HIGH: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: XCircle },
    MEDIUM: { color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-200', icon: AlertTriangle },
    LOW: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: AlertTriangle },
};

const STATUS_CONFIG = {
    open: { label: 'Open', color: 'text-red-600 bg-red-50 border border-red-200' },
    proposed: { label: 'Fix Proposed', color: 'text-blue-600 bg-blue-50 border border-blue-200' },
    resolved: { label: 'Resolved', color: 'text-emerald-600 bg-emerald-50 border border-emerald-200' },
};

const VENDOR_ICONS = { cisco: Wifi, arista: Cpu, palo_alto: Server };

function ScoreRing({ score }) {
    const radius = 52;
    const circ = 2 * Math.PI * radius;
    const dash = (score / 100) * circ;
    const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

    return (
        <div className="flex flex-col items-center justify-center">
            <svg width="140" height="140" viewBox="0 0 140 140">
                <circle cx="70" cy="70" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="14" />
                <circle cx="70" cy="70" r={radius} fill="none" stroke={color} strokeWidth="14"
                    strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
                    transform="rotate(-90 70 70)" className="transition-all duration-700" />
                <text x="70" y="70" textAnchor="middle" dominantBaseline="central"
                    fontSize="26" fontWeight="900" fill={color}>{score}</text>
                <text x="70" y="92" textAnchor="middle" fontSize="10" fill="#94a3b8" fontWeight="600">/100</text>
            </svg>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 -mt-2">Compliance Score</p>
        </div>
    );
}

function RemediationModal({ violation, onClose, onApprove, onPropose }) {
    if (!violation) return null;
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">{violation.rule_id}</p>
                        <h3 className="text-lg font-black text-slate-900">{violation.rule_description}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Device</p>
                            <p className="font-bold text-slate-900">{violation.device_hostname}</p>
                            <p className="text-slate-500 text-xs">{violation.vendor}</p>
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_CONFIG[violation.status]?.color}`}>
                                {STATUS_CONFIG[violation.status]?.label}
                            </span>
                        </div>
                    </div>

                    {violation.remediation_cmd && (
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Remediation Command</p>
                            <div className="bg-slate-900 rounded-xl p-4">
                                <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-all">
                                    {violation.remediation_cmd}
                                </pre>
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex gap-3 p-6 pt-0">
                    {violation.status === 'open' && (
                        <button onClick={() => onPropose(violation.id)}
                            className="flex-1 py-3 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-colors text-sm uppercase tracking-wider">
                            Propose Fix
                        </button>
                    )}
                    {violation.status === 'proposed' && (
                        <button onClick={() => onApprove(violation.id)}
                            className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl hover:bg-emerald-700 transition-colors text-sm uppercase tracking-wider">
                            ✓ Approve & Apply Fix
                        </button>
                    )}
                    <button onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-xl hover:bg-slate-200 transition-colors text-sm uppercase tracking-wider">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Compliance() {
    const [violations, setViolations] = useState([]);
    const [score, setScore] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedViolation, setSelectedViolation] = useState(null);
    const [statusFilter, setStatusFilter] = useState('all');
    const [toast, setToast] = useState(null);
    const [auditLoading, setAuditLoading] = useState(false);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchData = useCallback(async () => {
        try {
            const [vRes, sRes] = await Promise.all([
                fetch(`${API_BASE}/compliance/violations`),
                fetch(`${API_BASE}/compliance/score`),
            ]);
            const vData = await vRes.json();
            const sData = await sRes.json();
            setViolations(Array.isArray(vData) ? vData : []);
            setScore(sData);
        } catch (e) {
            console.error('Failed to fetch compliance data', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePropose = async (id) => {
        await fetch(`${API_BASE}/compliance/violations/${id}/propose`, { method: 'POST' });
        showToast('Remediation proposed — review and approve to apply.');
        setSelectedViolation(null);
        fetchData();
    };

    const handleApprove = async (id) => {
        await fetch(`${API_BASE}/compliance/violations/${id}/approve`, { method: 'POST' });
        showToast('Fix approved and applied! Compliance score updated.', 'success');
        setSelectedViolation(null);
        fetchData();
    };

    const runDemoAudit = async () => {
        setAuditLoading(true);
        const payload = {
            device_id: `demo-${Date.now()}`,
            hostname: 'SW-CORE-DEMO-01',
            vendor: 'cisco',
            config_text: `
version 17.6
hostname SW-CORE-DEMO-01
!
line vty 0 15
 transport input telnet ssh
!
ap profile HighDensify
 dot11 5ghz data-rate 1.0 enable
`
        };
        try {
            const res = await fetch(`${API_BASE}/compliance/audit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            showToast(`Audit complete: ${data.violations_found} violations found, ${data.new_violations_saved} new.`);
            fetchData();
        } catch (e) {
            showToast('Audit failed — ensure backend is running.', 'error');
        } finally {
            setAuditLoading(false);
        }
    };

    const filtered = statusFilter === 'all'
        ? violations
        : violations.filter(v => v.status === statusFilter);

    const highCount = violations.filter(v => v.severity === 'HIGH' && v.status === 'open').length;
    const medCount = violations.filter(v => v.severity === 'MEDIUM' && v.status === 'open').length;
    const resolvedCount = violations.filter(v => v.status === 'resolved').length;

    return (
        <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto pb-6 overflow-hidden">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-2xl shadow-2xl font-bold text-sm animate-in fade-in slide-in-from-top duration-300 ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight uppercase flex items-center gap-3">
                        <ShieldCheck className="w-8 h-8 text-brand-orange" />
                        Compliance Engine
                    </h1>
                    <p className="text-brand-muted font-medium">Real-Time Multi-Vendor Security Baseline & Governance Dashboard.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={runDemoAudit} disabled={auditLoading}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest border border-brand-border rounded-xl text-brand-muted hover:text-slate-900 transition-colors disabled:opacity-50">
                        <Terminal className="w-3.5 h-3.5" />
                        {auditLoading ? 'Auditing...' : 'Run Demo Audit'}
                    </button>
                    <button onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest border border-brand-border rounded-xl text-brand-muted hover:text-slate-900 transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                </div>
            </div>

            {/* Score + Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                <div className="col-span-2 md:col-span-1 bg-white border border-brand-border rounded-2xl p-5 flex items-center justify-center shadow-sm">
                    {loading ? (
                        <div className="animate-pulse w-32 h-32 rounded-full bg-slate-100" />
                    ) : (
                        <ScoreRing score={score?.score ?? 100} />
                    )}
                </div>
                {[
                    { label: 'High Severity', value: highCount, color: 'text-red-600', icon: XCircle },
                    { label: 'Medium Severity', value: medCount, color: 'text-orange-500', icon: AlertTriangle },
                    { label: 'Resolved', value: resolvedCount, color: 'text-emerald-600', icon: CheckCircle2 },
                ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="bg-white border border-brand-border rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3">
                            <Icon className={`w-4 h-4 ${color}`} />
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
                        </div>
                        <p className={`text-4xl font-black ${color}`}>{value}</p>
                    </div>
                ))}
            </div>

            {/* Violations Table */}
            <div className="flex-1 flex flex-col min-h-0 bg-white border border-brand-border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
                    <ShieldCheck className="w-4 h-4 text-brand-orange" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Active Violations</span>
                    <div className="ml-auto flex gap-2">
                        {['all', 'open', 'proposed', 'resolved'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${statusFilter === s ? 'bg-brand-orange text-white' : 'text-slate-500 hover:text-slate-900 border border-slate-200'}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-12 flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 rounded-full border-4 border-brand-orange border-t-transparent" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <div className="bg-emerald-50 p-6 rounded-3xl mb-4">
                                <ShieldCheck className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h3 className="text-lg font-black text-slate-900">No Violations</h3>
                            <p className="text-sm text-slate-400 mt-1">Run an audit to check your fleet for compliance issues.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    {['Device', 'Vendor', 'Rule', 'Severity', 'Status', 'Detected', ''].map(h => (
                                        <th key={h} className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((v) => {
                                    const sev = SEVERITY_CONFIG[v.severity] || SEVERITY_CONFIG.MEDIUM;
                                    const SevIcon = sev.icon;
                                    const VIcon = VENDOR_ICONS[v.vendor?.toLowerCase().replace(' ', '_')] || Server;
                                    return (
                                        <tr key={v.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-900 text-sm">{v.device_hostname}</p>
                                                <p className="text-xs text-slate-400 font-mono">{v.device_id}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <VIcon className="w-4 h-4 text-slate-400" />
                                                    <span className="text-sm text-slate-600 font-medium capitalize">{v.vendor}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-xs font-mono text-brand-orange font-bold">{v.rule_id}</p>
                                                <p className="text-xs text-slate-600 truncate" title={v.rule_description}>{v.rule_description}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2 py-1 rounded-full border ${sev.color} ${sev.bg} ${sev.border}`}>
                                                    <SevIcon className="w-3 h-3" />
                                                    {v.severity}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black px-2 py-1 rounded-full ${STATUS_CONFIG[v.status]?.color}`}>
                                                    {STATUS_CONFIG[v.status]?.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-1 text-xs text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(v.created_at).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => setSelectedViolation(v)}
                                                    className="flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-orange-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Review <ChevronRight className="w-3 h-3" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* HITL Modal */}
            <RemediationModal
                violation={selectedViolation}
                onClose={() => setSelectedViolation(null)}
                onPropose={handlePropose}
                onApprove={handleApprove}
            />
        </div>
    );
}
