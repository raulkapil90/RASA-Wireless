import React, { useState, useEffect, useCallback } from 'react';
import {
    Ticket, Plus, RefreshCw, ExternalLink, AlertTriangle,
    CheckCircle2, Clock, ChevronDown, X, User, AlertCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const PRIORITY_CONFIG = {
    Critical: { color: 'text-red-700', bg: 'bg-red-100 border-red-300', dot: 'bg-red-600' },
    High: { color: 'text-orange-600', bg: 'bg-orange-50 border-orange-300', dot: 'bg-orange-500' },
    Medium: { color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
    Low: { color: 'text-slate-500', bg: 'bg-slate-50 border-slate-200', dot: 'bg-slate-400' },
};

const STATUS_CONFIG = {
    'Open': { color: 'text-blue-600 bg-blue-50 border border-blue-200' },
    'In Progress': { color: 'text-orange-600 bg-orange-50 border border-orange-200' },
    'Resolved': { color: 'text-emerald-600 bg-emerald-50 border border-emerald-200' },
    'Done': { color: 'text-slate-500 bg-slate-50 border border-slate-200' },
};

function CreateTicketModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ summary: '', description: '', priority: 'High', issue_type: 'Bug' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async () => {
        if (!form.summary.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/jira/tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create ticket');
            const data = await res.json();
            onCreated(data);
            onClose();
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                            <Ticket className="w-5 h-5 text-brand-orange" /> Create Jira Ticket
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">Pre-filled for network incidents</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                        </div>
                    )}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Summary *</label>
                        <input value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))}
                            placeholder="e.g. Core switch CPU spike in DC1"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Description</label>
                        <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            rows={3} placeholder="Describe the network incident..."
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Priority</label>
                            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30">
                                {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Type</label>
                            <select value={form.issue_type} onChange={e => setForm(f => ({ ...f, issue_type: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30">
                                {['Bug', 'Task', 'Incident', 'Change Request'].map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 p-6 pt-0">
                    <button onClick={handleSubmit} disabled={loading || !form.summary.trim()}
                        className="flex-1 py-3 bg-brand-orange text-white font-black rounded-xl hover:bg-orange-600 transition-colors text-sm uppercase tracking-wider disabled:opacity-50">
                        {loading ? 'Creating...' : 'Create Ticket'}
                    </button>
                    <button onClick={onClose} className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-xl hover:bg-slate-200 transition-colors text-sm uppercase tracking-wider">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function Jira() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isDemo, setIsDemo] = useState(false);
    const [showCreate, setShowCreate] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchTickets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/jira/tickets`);
            const data = await res.json();
            setTickets(data.issues || []);
            setIsDemo(data.demo || false);
        } catch (e) {
            console.error('Jira fetch failed', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTickets(); }, [fetchTickets]);

    const filtered = statusFilter === 'all' ? tickets : tickets.filter(t => t.status === statusFilter);

    const stats = {
        total: tickets.length,
        open: tickets.filter(t => t.status === 'Open').length,
        inProgress: tickets.filter(t => t.status === 'In Progress').length,
        critical: tickets.filter(t => t.priority === 'Critical').length,
    };

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
                        <Ticket className="w-8 h-8 text-brand-orange" /> Jira Tickets
                    </h1>
                    <p className="text-brand-muted font-medium">Network Operations ticket queue from Jira Cloud.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={fetchTickets}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest border border-brand-border rounded-xl text-brand-muted hover:text-slate-900 transition-colors">
                        <RefreshCw className="w-3.5 h-3.5" /> Refresh
                    </button>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest bg-brand-orange text-white rounded-xl hover:bg-orange-600 transition-colors shadow-md shadow-brand-orange/30">
                        <Plus className="w-3.5 h-3.5" /> Create Ticket
                    </button>
                </div>
            </div>

            {/* Demo banner */}
            {isDemo && (
                <div className="shrink-0 flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-amber-700 font-medium">
                        <span className="font-black">Demo Mode</span> — Add <code className="bg-amber-100 px-1 rounded">JIRA_BASE_URL</code>, <code className="bg-amber-100 px-1 rounded">JIRA_EMAIL</code>, and <code className="bg-amber-100 px-1 rounded">JIRA_API_TOKEN</code> to your <code className="bg-amber-100 px-1 rounded">.env</code> file to connect to Jira Cloud.
                    </p>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
                {[
                    { label: 'Total Tickets', value: stats.total, color: 'text-slate-900' },
                    { label: 'Open', value: stats.open, color: 'text-blue-600' },
                    { label: 'In Progress', value: stats.inProgress, color: 'text-orange-500' },
                    { label: 'Critical', value: stats.critical, color: 'text-red-600' },
                ].map(({ label, value, color }) => (
                    <div key={label} className="bg-white border border-brand-border rounded-2xl p-5 shadow-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">{label}</p>
                        <p className={`text-4xl font-black ${color}`}>{loading ? '—' : value}</p>
                    </div>
                ))}
            </div>

            {/* Tickets Table */}
            <div className="flex-1 flex flex-col min-h-0 bg-white border border-brand-border rounded-2xl shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 shrink-0">
                    <Ticket className="w-4 h-4 text-brand-orange" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Network Tickets</span>
                    <div className="ml-auto flex gap-2">
                        {['all', 'Open', 'In Progress', 'Resolved'].map(s => (
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
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-4" />
                            <h3 className="text-lg font-black text-slate-900">No Tickets</h3>
                            <p className="text-sm text-slate-400 mt-1">The queue is clear for this filter.</p>
                        </div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50">
                                    {['Key', 'Summary', 'Priority', 'Assignee', 'Status', ''].map(h => (
                                        <th key={h} className="px-6 py-3 text-left text-[10px] font-black uppercase tracking-wider text-slate-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(ticket => {
                                    const prio = PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.Medium;
                                    const status = STATUS_CONFIG[ticket.status] || { color: 'text-slate-500 bg-slate-50 border border-slate-200' };
                                    return (
                                        <tr key={ticket.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-black font-mono text-brand-orange">{ticket.key}</span>
                                            </td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-sm font-medium text-slate-900 truncate" title={ticket.summary}>{ticket.summary}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border ${prio.bg} ${prio.color}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full ${prio.dot}`} />
                                                    {ticket.priority}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-brand-orange/10 flex items-center justify-center">
                                                        <User className="w-3 h-3 text-brand-orange" />
                                                    </div>
                                                    <span className="text-xs text-slate-600">{ticket.assignee}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${status.color}`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {ticket.url !== '#' && (
                                                    <a href={ticket.url} target="_blank" rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-xs font-bold text-brand-orange hover:text-orange-700 transition-colors">
                                                        Open <ExternalLink className="w-3 h-3" />
                                                    </a>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showCreate && (
                <CreateTicketModal
                    onClose={() => setShowCreate(false)}
                    onCreated={(t) => {
                        showToast(`Ticket ${t.key || 'DEMO-001'} created successfully!`);
                        fetchTickets();
                    }}
                />
            )}
        </div>
    );
}
