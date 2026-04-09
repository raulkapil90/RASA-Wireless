import React, { useState, useEffect, useCallback } from 'react';
import {
    Cloud, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const PRIORITY_CONFIG = {
    Critical: { color: 'text-red-700', bg: 'bg-red-100 border-red-300', dot: 'bg-red-600' },
    High: { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-300', dot: 'bg-orange-500' },
    Medium: { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
    Low: { color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
};

const STATUS_CONFIG = {
    'New': { color: 'text-blue-600 bg-blue-50 border border-blue-200' },
    'In Progress': { color: 'text-orange-600 bg-orange-50 border border-orange-200' },
    'Pending': { color: 'text-yellow-600 bg-yellow-50 border border-yellow-200' },
    'Escalated': { color: 'text-red-600 bg-red-50 border border-red-200' },
    'Closed': { color: 'text-slate-500 bg-slate-50 border border-slate-200' },
};

export default function Salesforce() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDemo, setIsDemo] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');

    const fetchCases = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/salesforce/cases`);
            const data = await res.json();
            setCases(data.cases || []);
            setIsDemo(data.demo || false);
        } catch (e) {
            console.error('Salesforce fetch failed', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchCases(); }, [fetchCases]);

    const filtered = statusFilter === 'all' ? cases : cases.filter(c => c.status === statusFilter);

    const stats = {
        total: cases.length,
        high: cases.filter(c => c.priority === 'High' || c.priority === 'Critical').length,
        escalated: cases.filter(c => c.status === 'Escalated').length,
        new: cases.filter(c => c.status === 'New').length,
    };

    return (
        <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto pb-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0 pt-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight uppercase flex items-center gap-3">
                        <Cloud className="w-8 h-8 text-blue-500" /> Salesforce Cases
                    </h1>
                    <p className="text-brand-muted font-medium">Network Cases from your Salesforce org — Category: Network.</p>
                </div>
                <button onClick={fetchCases}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest border border-brand-border rounded-xl text-brand-muted hover:text-slate-900 transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                </button>
            </div>

            {/* Demo banner */}
            {isDemo && (
                <div className="shrink-0 flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-amber-700 font-medium">
                        <span className="font-black">Demo Mode</span> — Add <code className="bg-amber-100 px-1 rounded">SF_CLIENT_ID</code>, <code className="bg-amber-100 px-1 rounded">SF_CLIENT_SECRET</code>, <code className="bg-amber-100 px-1 rounded">SF_USERNAME</code>, <code className="bg-amber-100 px-1 rounded">SF_PASSWORD</code>, and <code className="bg-amber-100 px-1 rounded">SF_SECURITY_TOKEN</code> to your <code className="bg-amber-100 px-1 rounded">.env</code> to connect Salesforce.
                    </p>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                {[
                    { label: 'Total Cases', value: stats.total, color: 'text-slate-900' },
                    { label: 'New', value: stats.new, color: 'text-blue-600' },
                    { label: 'High / Critical', value: stats.high, color: 'text-orange-500' },
                    { label: 'Escalated', value: stats.escalated, color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white border border-brand-border rounded-2xl p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">{label}</p>
                        <p className={`text-4xl font-black ${color}`}>{loading ? '—' : value}</p>
                    </div>
                ))}
            </div>

            {/* Cases Table */}
            <div className="flex-1 flex flex-col min-h-0 bg-white border border-brand-border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
                    <Cloud className="w-4 h-4 text-blue-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Network Cases</span>
                    <div className="ml-auto flex gap-2">
                        {['all', 'New', 'In Progress', 'Escalated', 'Closed'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-colors ${statusFilter === s ? 'bg-blue-500 text-white' : 'text-slate-500 hover:text-slate-900 border border-slate-200'}`}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-12 flex items-center justify-center">
                            <div className="animate-spin w-8 h-8 rounded-full border-4 border-blue-500 border-t-transparent" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-center">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-4" />
                            <h3 className="text-lg font-black text-slate-900">No Cases</h3>
                            <p className="text-sm text-slate-400 mt-1">No network cases match this filter.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    {['Case #', 'Subject', 'Priority', 'Status', 'Category', ''].map(h => (
                                        <th key={h} className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(c => {
                                    const prio = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.Medium;
                                    const status = STATUS_CONFIG[c.status] || { color: 'text-slate-500 bg-slate-50 border border-slate-200' };
                                    return (
                                        <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-black font-mono text-blue-600">{c.case_number}</span>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-sm font-medium text-slate-900 truncate" title={c.subject}>{c.subject}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border ${prio.bg} ${prio.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                                    {c.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${status.color}`}>{c.status}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs text-slate-500">{c.category}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <a href={c.url} target="_blank" rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs font-bold text-blue-500 hover:text-blue-700 transition-colors">
                                                    Open <ExternalLink className="w-3 h-3" />
                                                </a>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
