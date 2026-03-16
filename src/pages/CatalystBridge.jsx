import React, { useState, useEffect } from 'react';
import {
    AlertTriangle, Shield, Zap, CheckCircle2, XCircle, Clock,
    ChevronRight, RefreshCw, Radio, Wifi, Server, Activity
} from 'lucide-react';
import { fetchIssues, proposeRemediation, approveRemediation, executeRemediation } from '../services/cccApi';

const severityConfig = {
    CRITICAL: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, badge: 'bg-red-500' },
    HIGH: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', icon: Zap, badge: 'bg-orange-500' },
    MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: Radio, badge: 'bg-yellow-500' },
    LOW: { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', icon: Activity, badge: 'bg-blue-500' },
};

function IssueCard({ issue, narrative, onPropose }) {
    const sev = severityConfig[narrative.severity] || severityConfig.LOW;
    const SevIcon = sev.icon;

    return (
        <div className={`card ${sev.bg} ${sev.border} border shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${sev.badge} text-white`}>
                        <SevIcon className="w-5 h-5" />
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${sev.color}`}>
                        {narrative.severity}
                    </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold">
                    {narrative.timestamp ? new Date(narrative.timestamp).toLocaleString() : 'Just now'}
                </span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-black text-slate-900 mb-3 tracking-tight leading-tight">
                {issue.name || issue.issue_id}
            </h3>

            {/* Narrative AI Insight */}
            <div className="bg-white/80 rounded-2xl p-4 mb-4 border border-slate-200/60">
                <h4 className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <Wifi className="w-3 h-3" /> AI INSIGHT
                </h4>
                <p className="text-sm text-slate-800 font-medium leading-relaxed">
                    {narrative.plain_english_summary}
                </p>
            </div>

            {/* Affected Devices */}
            {narrative.affected_devices?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {narrative.affected_devices.map((d, i) => (
                        <span key={i} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[11px] font-bold flex items-center gap-1">
                            <Server className="w-3 h-3" /> {d}
                        </span>
                    ))}
                </div>
            )}

            {/* Suggested Action */}
            {narrative.suggested_action && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-4">
                    <p className="text-xs text-emerald-800 font-bold leading-relaxed">
                        <span className="text-emerald-600 font-black uppercase text-[10px] mr-2">Suggested:</span>
                        {narrative.suggested_action}
                    </p>
                </div>
            )}

            {/* HITL Button */}
            <button
                onClick={() => onPropose(issue.issue_id)}
                className="w-full px-4 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-orange transition-colors flex items-center justify-center gap-2"
            >
                <Shield className="w-4 h-4" /> Propose Remediation
                <ChevronRight className="w-3 h-3" />
            </button>
        </div>
    );
}

function RemediationPanel({ proposal, onApprove, onExecute, onCancel, executing }) {
    if (!proposal) return null;

    const riskColors = {
        LOW: 'text-emerald-600 bg-emerald-50',
        MEDIUM: 'text-yellow-600 bg-yellow-50',
        HIGH: 'text-orange-600 bg-orange-50',
        CRITICAL: 'text-red-600 bg-red-50',
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-8 animate-in slide-in-from-bottom-4 duration-500">
                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-brand-orange/10 rounded-2xl">
                        <Shield className="w-8 h-8 text-brand-orange" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Remediation Proposal</h2>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Human-in-the-Loop Approval Required</p>
                    </div>
                </div>

                {/* Proposal Details */}
                <div className="space-y-4 mb-6">
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-24">Issue</span>
                        <span className="text-sm font-bold text-slate-900">{proposal.issue_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-24">Risk Level</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${riskColors[proposal.risk_level] || ''}`}>
                            {proposal.risk_level}
                        </span>
                    </div>
                    <div className="flex items-start gap-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase w-24 pt-1">Action</span>
                        <p className="text-sm font-medium text-slate-800 leading-relaxed">{proposal.human_readable_action}</p>
                    </div>
                </div>

                {/* API Payload Preview */}
                <div className="bg-slate-900 rounded-2xl p-5 mb-6">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">API Payload Preview</h4>
                    <code className="text-xs text-emerald-400 block whitespace-pre-wrap font-mono">
                        {proposal.api_method} {proposal.api_endpoint}{"\n"}
                        {JSON.stringify(proposal.api_body, null, 2)}
                    </code>
                </div>

                {/* Expiry */}
                <div className="flex items-center gap-2 mb-6 text-xs text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>Expires: {new Date(proposal.expires_at).toLocaleTimeString()}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    {!proposal.approved ? (
                        <>
                            <button
                                onClick={onApprove}
                                className="flex-1 px-6 py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 className="w-5 h-5" /> Approve & Execute
                            </button>
                            <button
                                onClick={onCancel}
                                className="px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-5 h-5" /> Reject
                            </button>
                        </>
                    ) : (
                        <div className="flex-1 px-6 py-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-sm uppercase tracking-widest text-center flex items-center justify-center gap-2">
                            {executing ? (
                                <><RefreshCw className="w-5 h-5 animate-spin" /> Executing...</>
                            ) : (
                                <><CheckCircle2 className="w-5 h-5" /> Executed Successfully</>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function CatalystBridge() {
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [proposal, setProposal] = useState(null);
    const [executing, setExecuting] = useState(false);

    const loadIssues = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchIssues();
            setIssues(data.issues || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadIssues(); }, []);

    const handlePropose = async (issueId) => {
        try {
            const prop = await proposeRemediation(issueId);
            setProposal(prop);
        } catch (err) {
            alert(`Failed to propose: ${err.message}`);
        }
    };

    const handleApproveAndExecute = async () => {
        if (!proposal) return;
        setExecuting(true);
        try {
            await approveRemediation(proposal.proposal_id);
            const result = await executeRemediation(proposal.proposal_id);
            setProposal({ ...proposal, approved: true });
            setTimeout(() => {
                setProposal(null);
                setExecuting(false);
                loadIssues();
            }, 2000);
        } catch (err) {
            alert(`Execution failed: ${err.message}`);
            setExecuting(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        Catalyst <span className="text-brand-orange">Bridge</span>
                    </h1>
                    <p className="text-brand-muted font-medium mt-1">
                        Live CCC Issues · Narrative Intelligence · HITL Remediation
                    </p>
                </div>
                <button
                    onClick={loadIssues}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-orange transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 font-bold text-sm">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && !issues.length && (
                <div className="text-center py-20">
                    <RefreshCw className="w-8 h-8 text-brand-orange animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Loading CCC Issues...
                    </p>
                </div>
            )}

            {/* Issue Grid */}
            {!loading && issues.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {issues.map(({ issue, narrative }, idx) => (
                        <IssueCard
                            key={issue.issue_id || idx}
                            issue={issue}
                            narrative={narrative}
                            onPropose={handlePropose}
                        />
                    ))}
                </div>
            )}

            {/* Empty State */}
            {!loading && issues.length === 0 && !error && (
                <div className="text-center py-20 bg-emerald-50 rounded-3xl border-2 border-dashed border-emerald-200">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-black text-slate-900 mb-2">All Clear</h3>
                    <p className="text-slate-500 font-medium">No active issues from Cisco Catalyst Center.</p>
                </div>
            )}

            {/* Remediation Modal */}
            <RemediationPanel
                proposal={proposal}
                onApprove={handleApproveAndExecute}
                onExecute={handleApproveAndExecute}
                onCancel={() => setProposal(null)}
                executing={executing}
            />
        </div>
    );
}
