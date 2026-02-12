import React, { useState } from 'react';
import { analyzeLogs } from '../services/rasaAgent';
import {
    Terminal as TerminalIcon,
    BrainCircuit,
    Sparkles,
    ShieldCheck,
    AlertCircle,
    ChevronRight,
    Trash2,
    FileText,
    User,
    Wifi,
    Cpu,
    Search,
    Database,
    CheckCircle2
} from 'lucide-react';

const RemediationCard = ({ finding }) => {
    const severityColors = {
        critical: 'text-brand-red border-brand-red/20 bg-brand-red/10',
        warning: 'text-brand-orange border-brand-orange/20 bg-brand-orange/10',
        info: 'text-brand-blue border-brand-blue/20 bg-brand-blue/10'
    };

    const categoryIcons = {
        JOIN_FAILURE: <AlertCircle className="w-4 h-4" />,
        CLIENT_ISSUE: <User className="w-4 h-4" />,
        RF_INTERFERENCE: <Wifi className="w-4 h-4" />,
        GENERAL: <ShieldCheck className="w-4 h-4" />
    };

    return (
        <div className="card border-brand-orange/10 shadow-lg animate-in slide-in-from-right-4 duration-500 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-orange" />
                    <span className={`badge ${severityColors[finding.severity]} uppercase tracking-tighter`}>
                        {finding.severity}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {finding.confidence && (
                        <div className="flex flex-col items-end gap-1">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Confidence</span>
                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                                <div
                                    className={`h-full transition-all duration-1000 ${finding.confidence > 80 ? 'bg-brand-green' : 'bg-brand-orange'}`}
                                    style={{ width: `${finding.confidence}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {finding.category && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[9px] font-black text-slate-500 uppercase tracking-wider border border-slate-200">
                            {categoryIcons[finding.category]}
                            {finding.category.replace('_', ' ')}
                        </div>
                    )}
                </div>
            </div>

            <h3 className="text-xl font-black text-slate-900 mb-4 tracking-tight leading-tight">{finding.title}</h3>

            <div className="bg-brand-orange/5 border border-brand-orange/10 rounded-2xl p-5 mb-6">
                <h4 className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" /> RASA Diagnosis
                </h4>
                <p className="text-sm text-slate-800 font-bold leading-relaxed italic">
                    "{finding.diagnosis || 'No specific diagnosis available.'}"
                </p>
            </div>

            <p className="text-xs text-brand-muted mb-8 px-1">
                <span className="font-black text-slate-900/40 uppercase tracking-widest text-[9px] mr-2">Evidence Buffer:</span>
                {finding.evidence}
            </p>

            <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 mb-4 px-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Actionable Remediation
                </h4>
                {finding.remediation.map((step, idx) => (
                    <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-brand-border group hover:border-brand-orange/20 hover:bg-white transition-all duration-300">
                        <span className="shrink-0 text-brand-orange font-black text-xs h-6 w-6 rounded-lg bg-brand-orange/10 flex items-center justify-center group-hover:bg-brand-orange group-hover:text-white transition-colors">{idx + 1}</span>
                        <p className="text-sm text-slate-700 font-medium leading-relaxed">{step}</p>
                    </div>
                ))}
            </div>

            {finding.proTip && (
                <div className="mt-8 pt-6 border-t border-dashed border-brand-border">
                    <div className="flex items-start gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100">
                        <span className="text-lg">💡</span>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ciscco Expert Pro-Tip</p>
                            <p className="text-xs text-emerald-800 font-medium leading-relaxed">{finding.proTip}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default function LogAnalysis() {
    const [logs, setLogs] = useState('');
    const [findings, setFindings] = useState([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [thoughtSteps, setThoughtSteps] = useState([]);

    const handleAnalyze = async () => {
        if (!logs.trim()) return;
        setIsAnalyzing(true);
        setThoughtSteps([]);
        setFindings([]);

        try {
            const results = await analyzeLogs(logs, (step) => {
                setThoughtSteps(prev => [...prev, step]);
            });
            setFindings(results);
        } catch (error) {
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const clearLogs = () => {
        setLogs('');
        setFindings([]);
        setThoughtSteps([]);
    };

    const loadSampleLog = () => {
        setLogs(`*capwap_cli: Discovery Request from AP 00:a1:b2:c3:d4:e5
*spamApTask0: Jun 12 14:05:22.341: %CAPWAP-3-DTLS_HS_FAILURE: DTLS handshake failed for AP 00:a1:b2:c3:d4:e5
*dot11_driver: Received DEAUTH from client d8:32:14:00:11:22 reason 15
*rrm_ctrl: Radar detected on channel 52 - Non-Occupancy Period started`);
    };

    const loadCatalystSample = () => {
        setLogs(`*Apr 30 06:55:49.022: %CAPWAP-3-DTLS_FAILURE: AP 00:d1:e2:f3:a4:b5 failed to join, DTLS teardown
*Apr 30 06:55:53.770: CAPWAP State: DTLS Teardown
*Jun 12 10:15:33.122: %DOT11-6-DISASSOC: Client d8:32:14:00:11:22 disassociate from AP 9120-AP-01 disassoc reason: 15
*Jun 12 11:22:45.001: %RRM-6-RADAR_DETECTED: Radar signals have been detected on channel 100`);
    };

    const thoughtIcons = [
        <Search className="w-4 h-4" />,
        <Database className="w-4 h-4" />,
        <Cpu className="w-4 h-4" />,
        <CheckCircle2 className="w-4 h-4" />
    ];

    return (
        <div className="h-full flex flex-col gap-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight uppercase">AI Log Analysis</h1>
                    <p className="text-brand-muted font-medium">Multi-OS Optimized Intelligence (AireOS & Catalyst C9800).</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <button
                        onClick={loadSampleLog}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-brand-muted hover:text-slate-900 transition-colors uppercase tracking-widest border border-brand-border rounded-xl"
                    >
                        <FileText className="w-3.5 h-3.5" /> AireOS Sample
                    </button>
                    <button
                        onClick={loadCatalystSample}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-brand-muted hover:text-slate-900 transition-colors uppercase tracking-widest border border-brand-border rounded-xl"
                    >
                        <Sparkles className="w-3.5 h-3.5" /> Catalyst Sample
                    </button>
                    <button
                        onClick={clearLogs}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-brand-muted hover:text-brand-red transition-colors uppercase tracking-widest"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">
                {/* Left Side: Log Ingestion */}
                <div className="flex flex-col h-full gap-4">
                    <div className="flex items-center gap-2 px-5 py-3 bg-slate-900 border border-slate-800 rounded-t-2xl border-b-0 shrink-0">
                        <TerminalIcon className="w-4 h-4 text-brand-orange" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">AIREOS_SYSLOG_INPUT</span>
                    </div>
                    <div className="flex-1 relative min-h-[400px]">
                        <textarea
                            value={logs}
                            onChange={(e) => setLogs(e.target.value)}
                            placeholder="Paste Cisco WLC/AP logs here..."
                            className="w-full h-full terminal bg-[#0f172a] border-slate-800 resize-none focus:outline-none focus:border-brand-orange/30 p-8 rounded-b-2xl shadow-xl transition-all font-mono text-sm"
                        />
                        {logs && !isAnalyzing && (
                            <button
                                onClick={handleAnalyze}
                                className="absolute bottom-8 right-8 btn-primary px-8 py-4 flex items-center gap-3 shadow-xl shadow-brand-orange/40 animate-in fade-in zoom-in duration-300"
                            >
                                <BrainCircuit className="w-5 h-5" />
                                Run RASA Intelligence
                            </button>
                        )}
                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center rounded-b-2xl p-8">
                                <div className="w-full max-w-sm flex flex-col items-center gap-8">
                                    <div className="w-14 h-14 border-4 border-brand-orange/10 border-t-brand-orange rounded-full animate-spin" />

                                    <div className="w-full space-y-3">
                                        {thoughtSteps.map((step, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-white/90 animate-in slide-in-from-bottom-2 duration-300">
                                                <div className="w-6 h-6 rounded-full bg-brand-orange/20 border border-brand-orange/40 flex items-center justify-center text-brand-orange">
                                                    {thoughtIcons[idx % thoughtIcons.length]}
                                                </div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{step}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <span className="text-brand-orange font-black tracking-widest uppercase text-[10px] animate-pulse">Engaging Neural Engine...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Side: AI Insights */}
                <div className="flex flex-col h-full gap-4 overflow-y-auto">
                    <div className="flex items-center gap-2 px-5 py-3 bg-white border border-brand-border rounded-2xl shrink-0 shadow-sm">
                        <BrainCircuit className="w-4 h-4 text-brand-orange" />
                        <span className="text-[10px] font-black text-slate-900 tracking-[0.2em] uppercase">RASA_INSIGHT_LOGIC</span>
                    </div>

                    <div className="flex-1 space-y-6">
                        {findings.length > 0 ? (
                            findings.map((finding, idx) => (
                                <RemediationCard key={idx} finding={finding} />
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-brand-border rounded-3xl bg-white shadow-inner">
                                <div className="bg-brand-orange/5 p-6 rounded-3xl mb-6 ring-1 ring-brand-orange/10">
                                    <Sparkles className="w-10 h-10 text-brand-orange" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-3 tracking-tight">System Ready</h3>
                                <p className="text-sm text-brand-muted max-w-xs font-medium leading-relaxed">Once you paste and analyze logs, RASA AI-generated remediation cards will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
