import React, { useState, useEffect, useCallback } from 'react';
import {
    Monitor, Plus, RefreshCw, ExternalLink, AlertTriangle, X,
    CheckCircle2, XCircle, Loader2, BarChart3, Search, Activity,
    Bell, Globe, Trash2, Wifi, WifiOff
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const ICON_MAP = {
    BarChart3, Search, Activity, Bell, Monitor, Globe
};

const AUTH_TYPE_CONFIG = {
    none: { label: 'No Auth', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    token: { label: 'API Token', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    oauth: { label: 'OAuth 2.0', color: 'text-purple-600 bg-purple-50 border-purple-200' },
};

const ICONS_LIST = ['Globe', 'BarChart3', 'Activity', 'Bell', 'Monitor', 'Search'];

function AddToolModal({ onClose, onAdded }) {
    const [form, setForm] = useState({ name: '', url: 'https://', auth_type: 'none', icon: 'Globe', description: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async () => {
        if (!form.name.trim() || !form.url.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/integrations/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed to register tool');
            const data = await res.json();
            onAdded(data);
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
                    <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-brand-orange" /> Register External Tool
                    </h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    {error && (
                        <div className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</div>
                    )}
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Name *</label>
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="e.g. Grafana Prod"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">URL *</label>
                        <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                            placeholder="https://grafana.yourcompany.com"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange" />
                    </div>
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Description</label>
                        <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            placeholder="Optional description"
                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30 focus:border-brand-orange" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Auth Type</label>
                            <select value={form.auth_type} onChange={e => setForm(f => ({ ...f, auth_type: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30">
                                <option value="none">No Auth</option>
                                <option value="token">API Token</option>
                                <option value="oauth">OAuth 2.0</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Icon</label>
                            <select value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/30">
                                {ICONS_LIST.map(i => <option key={i}>{i}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 p-6 pt-0">
                    <button onClick={handleSubmit} disabled={loading || !form.name.trim() || !form.url.trim()}
                        className="flex-1 py-3 bg-brand-orange text-white font-black rounded-xl hover:bg-orange-600 transition-colors text-sm uppercase tracking-wider disabled:opacity-50">
                        {loading ? 'Registering...' : 'Register Tool'}
                    </button>
                    <button onClick={onClose}
                        className="flex-1 py-3 bg-slate-100 text-slate-700 font-black rounded-xl hover:bg-slate-200 transition-colors text-sm uppercase tracking-wider">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function IFrameEmbed({ tool }) {
    const [blocked, setBlocked] = useState(false);
    const [loaded, setLoaded] = useState(false);

    return (
        <div className="flex-1 flex flex-col min-h-0">
            {!loaded && !blocked && (
                <div className="flex-1 flex items-center justify-center">
                    <div className="animate-spin w-8 h-8 rounded-full border-4 border-brand-orange border-t-transparent" />
                </div>
            )}
            {!blocked ? (
                <iframe
                    src={tool.url}
                    className={`flex-1 w-full border-0 rounded-b-2xl ${loaded ? '' : 'hidden'}`}
                    onLoad={() => setLoaded(true)}
                    onError={() => setBlocked(true)}
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                    title={tool.name}
                />
            ) : null}
            {blocked && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12 text-center">
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200">
                        <Monitor className="w-12 h-12 text-slate-400 mx-auto" />
                    </div>
                    <h3 className="text-lg font-black text-slate-900">iFrame Embed Blocked</h3>
                    <p className="text-sm text-slate-500 max-w-md">
                        <strong>{tool.name}</strong> prevents embedding via X-Frame-Options or CSP headers.
                        This is common for cloud-hosted tools.
                    </p>
                    <div className="bg-white border border-slate-200 rounded-xl p-4 text-left w-full max-w-sm">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Tool Details</p>
                        <p className="text-sm font-bold text-slate-900">{tool.name}</p>
                        <p className="text-xs text-slate-500 font-mono break-all">{tool.url}</p>
                        {tool.description && <p className="text-xs text-slate-500 mt-1">{tool.description}</p>}
                    </div>
                    <a href={tool.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 px-6 py-3 bg-brand-orange text-white font-black rounded-xl hover:bg-orange-600 transition-colors text-sm">
                        Open in New Tab <ExternalLink className="w-4 h-4" />
                    </a>
                </div>
            )}
        </div>
    );
}

export default function ExternalDashboards() {
    const [tools, setTools] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTool, setActiveTool] = useState(null);
    const [showAdd, setShowAdd] = useState(false);
    const [pingStatus, setPingStatus] = useState({});
    const [pinging, setPinging] = useState({});

    const fetchTools = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/integrations/`);
            const data = await res.json();
            setTools(data);
            if (data.length > 0 && !activeTool) setActiveTool(data[0].id);
        } catch (e) {
            console.error('Failed to fetch integrations', e);
        } finally {
            setLoading(false);
        }
    }, [activeTool]);

    useEffect(() => { fetchTools(); }, []);

    const pingTool = async (toolId) => {
        setPinging(p => ({ ...p, [toolId]: true }));
        try {
            const res = await fetch(`${API_BASE}/integrations/${toolId}/ping`);
            const data = await res.json();
            setPingStatus(p => ({ ...p, [toolId]: data.online }));
        } catch {
            setPingStatus(p => ({ ...p, [toolId]: false }));
        } finally {
            setPinging(p => ({ ...p, [toolId]: false }));
        }
    };

    const deleteTool = async (toolId) => {
        await fetch(`${API_BASE}/integrations/${toolId}`, { method: 'DELETE' });
        setTools(t => t.filter(x => x.id !== toolId));
        if (activeTool === toolId) setActiveTool(tools.find(x => x.id !== toolId)?.id || null);
    };

    const activeTool_obj = tools.find(t => t.id === activeTool);

    return (
        <div className="flex flex-col h-full gap-0 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 px-2 pt-2 pb-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1 tracking-tight uppercase flex items-center gap-3">
                        <Monitor className="w-8 h-8 text-slate-600" /> External Dashboards
                    </h1>
                    <p className="text-brand-muted font-medium">iFrame-embedded monitoring tools. Fallback API widget when CSP blocks embed.</p>
                </div>
                <button onClick={() => setShowAdd(true)}
                    className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest bg-brand-orange text-white rounded-xl hover:bg-orange-600 transition-colors shadow-md shadow-brand-orange/30 shrink-0">
                    <Plus className="w-3.5 h-3.5" /> Add Tool
                </button>
            </div>

            {/* Main area: sidebar tabs + content */}
            <div className="flex flex-1 min-h-0 gap-4">
                {/* Tool list sidebar */}
                <div className="w-56 shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">
                    {loading ? (
                        <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 text-brand-orange animate-spin" /></div>
                    ) : tools.map(tool => {
                        const IconComp = ICON_MAP[tool.icon] || Globe;
                        const online = pingStatus[tool.id];
                        const isPinging = pinging[tool.id];
                        const isActive = activeTool === tool.id;
                        const auth = AUTH_TYPE_CONFIG[tool.auth_type] || AUTH_TYPE_CONFIG.none;
                        return (
                            <div key={tool.id}
                                onClick={() => setActiveTool(tool.id)}
                                className={`group cursor-pointer rounded-xl border p-3 transition-all ${isActive ? 'bg-white border-brand-orange shadow-sm' : 'bg-white border-brand-border hover:border-slate-300'}`}>
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-brand-orange/10' : 'bg-slate-50'}`}>
                                            <IconComp className={`w-4 h-4 ${isActive ? 'text-brand-orange' : 'text-slate-500'}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-xs font-black truncate ${isActive ? 'text-brand-orange' : 'text-slate-900'}`}>{tool.name}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{tool.description || 'External tool'}</p>
                                        </div>
                                    </div>
                                    {/* Ping status dot */}
                                    {isPinging ? (
                                        <Loader2 className="w-3 h-3 text-slate-400 animate-spin shrink-0 mt-1" />
                                    ) : online === true ? (
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 mt-1" title="Online" />
                                    ) : online === false ? (
                                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1" title="Offline" />
                                    ) : (
                                        <div className="w-2 h-2 rounded-full bg-slate-200 shrink-0 mt-1" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded border ${auth.color}`}>{auth.label}</span>
                                    <button onClick={(e) => { e.stopPropagation(); pingTool(tool.id); }}
                                        className="ml-auto text-[9px] font-black text-slate-400 hover:text-brand-orange transition-colors opacity-0 group-hover:opacity-100">
                                        Ping
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); if (confirm(`Remove ${tool.name}?`)) deleteTool(tool.id); }}
                                        className="text-[9px] font-black text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    {!loading && tools.length === 0 && (
                        <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-xl">
                            <Globe className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-400">No tools registered yet</p>
                            <button onClick={() => setShowAdd(true)} className="text-xs text-brand-orange font-black mt-1">+ Add one</button>
                        </div>
                    )}
                </div>

                {/* iFrame content area */}
                <div className="flex-1 min-w-0 bg-white border border-brand-border rounded-2xl shadow-sm flex flex-col overflow-hidden">
                    {activeTool_obj ? (
                        <>
                            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
                                <div className="flex items-center gap-3">
                                    {React.createElement(ICON_MAP[activeTool_obj.icon] || Globe, { className: 'w-4 h-4 text-brand-orange' })}
                                    <span className="font-black text-slate-900 text-sm">{activeTool_obj.name}</span>
                                    <span className="text-xs text-slate-400 font-mono hidden md:block">{activeTool_obj.url}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => pingTool(activeTool_obj.id)}
                                        className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-brand-orange px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors">
                                        {pinging[activeTool_obj.id] ? <Loader2 className="w-3 h-3 animate-spin" /> :
                                            pingStatus[activeTool_obj.id] === true ? <Wifi className="w-3 h-3 text-emerald-500" /> :
                                                pingStatus[activeTool_obj.id] === false ? <WifiOff className="w-3 h-3 text-red-500" /> :
                                                    <Wifi className="w-3 h-3" />}
                                        Check
                                    </button>
                                    <a href={activeTool_obj.url} target="_blank" rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-brand-orange px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors">
                                        <ExternalLink className="w-3 h-3" /> Open
                                    </a>
                                </div>
                            </div>
                            <IFrameEmbed tool={activeTool_obj} />
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                            <Monitor className="w-12 h-12 text-slate-300 mb-4" />
                            <h3 className="text-lg font-black text-slate-400">Select a tool from the list</h3>
                        </div>
                    )}
                </div>
            </div>

            {showAdd && (
                <AddToolModal
                    onClose={() => setShowAdd(false)}
                    onAdded={(tool) => {
                        setTools(t => [...t, tool]);
                        setActiveTool(tool.id);
                    }}
                />
            )}
        </div>
    );
}
