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
    Activity,
    Cpu,
    Search,
    Database,
    CheckCircle2
} from 'lucide-react';

const RemediationCard = ({ finding }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const severityColors = {
        critical: 'text-brand-red border-brand-red/30 bg-brand-red/5',
        high: 'text-brand-red border-brand-red/30 bg-brand-red/5',
        warning: 'text-brand-orange border-brand-orange/30 bg-brand-orange/5',
        medium: 'text-brand-orange border-brand-orange/30 bg-brand-orange/5',
        info: 'text-brand-blue border-brand-blue/30 bg-brand-blue/5',
        low: 'text-brand-blue border-brand-blue/30 bg-brand-blue/5'
    };

    const categoryIcons = {
        JOIN_FAILURE: <AlertCircle className="w-4 h-4" />,
        IMAGE_FAILURE: <AlertCircle className="w-4 h-4" />,
        AUTH_FAILURE: <ShieldCheck className="w-4 h-4" />,
        CLIENT_ISSUE: <User className="w-4 h-4" />,
        RF_EVENT: <Wifi className="w-4 h-4" />,
        NETWORK_EVENT: <Activity className="w-4 h-4" />,
        UNKNOWN_ERR: <AlertCircle className="w-4 h-4" />,
        KNOWN_CAVEAT: <Database className="w-4 h-4" />,
        GENERAL: <ShieldCheck className="w-4 h-4" />
    };

    return (
        <div className="card bg-white border-slate-200/60 shadow-xl animate-in slide-in-from-right-4 duration-500 overflow-hidden hover:border-brand-orange/30 transition-all">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-brand-orange" />
                    <span className={`badge ${severityColors[finding.severity] || severityColors.info} px-3 py-1 font-black uppercase tracking-tighter shadow-sm`}>
                        {finding.severity}
                    </span>
                    {finding.phase && (
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-2">
                            {finding.phase}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    {finding.confidence && (
                        <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{finding.confidence}%</span>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Confidence</span>
                            </div>
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                                <div
                                    className={`h-full transition-all duration-1000 ${finding.confidence > 80 ? 'bg-brand-green' : 'bg-brand-orange'}`}
                                    style={{ width: `${finding.confidence}%` }}
                                />
                            </div>
                        </div>
                    )}
                    {finding.category && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 hover:bg-brand-orange/10 hover:text-brand-orange hover:border-brand-orange/30 transition-all rounded-full text-[10px] font-black text-slate-900 uppercase tracking-widest border border-slate-200 shadow-sm"
                        >
                            {categoryIcons[finding.category]}
                            {finding.category.replace('_', ' ')}
                            <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                        </button>
                    )}
                </div>
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight leading-tight">{finding.title}</h3>

            {/* Consensus badge */}
            {finding.consensus && (
                <div className="flex items-center gap-2 mb-5">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full border ${finding.consensus.agreement === 'high' ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                            finding.consensus.agreement === 'medium' ? 'text-brand-orange bg-brand-orange/5 border-brand-orange/20' :
                                'text-slate-500 bg-slate-50 border-slate-200'
                        }`}>⚖ {finding.consensus.agreement} consensus</span>
                    {finding.consensus.note && <span className="text-[9px] text-slate-400 font-medium italic">{finding.consensus.note}</span>}
                </div>
            )}

            <div className="bg-brand-orange/[0.03] border border-brand-orange/10 rounded-2xl p-6 mb-8 ring-1 ring-brand-orange/5">
                <h4 className="text-[10px] font-black text-brand-orange uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" /> RASA Diagnosis
                </h4>
                <p className="text-base text-slate-950 font-bold leading-relaxed italic">
                    "{finding.diagnosis || 'No specific diagnosis available.'}"
                </p>
            </div>

            {isExpanded && (
                <div className="mb-8 p-6 bg-slate-900 rounded-2xl border border-slate-800 animate-in slide-in-from-top-2 duration-300 shadow-2xl">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <TerminalIcon className="w-4 h-4 text-brand-orange" /> Advanced Reason Reference
                    </h4>
                    <div className="space-y-4">
                        <p className="text-xs text-white/95 font-bold leading-relaxed">
                            <span className="text-brand-orange mr-2">Core Fault:</span>
                            {finding.advancedReason?.fault || "802.11 State machine transition error detected in the protocol handler."}
                        </p>
                        <div className="pt-3 border-t border-slate-800">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Protocol Stack Impact</span>
                            <div className="grid grid-cols-2 gap-4">
                                {(finding.advancedReason?.impact || [
                                    { label: "L2 Association", status: "ok", value: "Established" },
                                    { label: "DTLS Tunnel", status: "error", value: "Rejected" }
                                ]).map((item, idx) => (
                                    <div key={idx} className="p-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
                                        <p className="text-[8px] text-slate-400 font-bold uppercase mb-1">{item.label}</p>
                                        <p className={`text-[10px] font-black uppercase ${item.status === 'ok' ? 'text-emerald-400' : 'text-brand-red'}`}>
                                            {item.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-xs text-slate-600 mb-8 px-1 font-medium italic">
                <span className="font-black text-slate-900/60 uppercase tracking-widest text-[10px] mr-2 not-italic">Evidence Context:</span>
                {finding.evidence}
            </p>

            <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2 mb-4 px-1">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" /> Actionable Remediation
                </h4>
                {(finding.remediation || []).map((step, idx) => (
                    <div key={idx} className="flex gap-4 p-5 bg-slate-50/80 rounded-2xl border border-slate-200/60 group hover:border-brand-orange/40 hover:bg-white hover:shadow-lg transition-all duration-300">
                        <span className="shrink-0 text-brand-orange font-black text-sm h-7 w-7 rounded-xl bg-brand-orange/10 flex items-center justify-center group-hover:bg-brand-orange group-hover:text-white transition-colors">{idx + 1}</span>
                        <p className="text-[15px] text-slate-900 font-bold leading-snug">{step}</p>
                    </div>
                ))}
            </div>

            {finding.proTip && (
                <div className="mt-8 pt-6 border-t border-dashed border-slate-200">
                    <div className="flex items-start gap-4 p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100 shadow-sm">
                        <div className="bg-emerald-500 text-white p-1 rounded-lg">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Ciscco Expert Pro-Tip</p>
                            <p className="text-sm text-emerald-950 font-black leading-relaxed">{finding.proTip}</p>
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
*Jun 12 10:15:33.122: %DOT11-6-DISASSOC: Client d8:32:14:00:11:22 disassociate from AP 9120-AP-01 disassoc reason: 15
*Jun 12 10:20:11.442: %DOT1X-3-EAP_FAILURE: EAP authentication failed for client d8:32:14:00:11:22
*Jun 12 10:25:05.991: %DOT11-4-WPA3_SAE_FAILURE: SAE handshake failed for client d8:32:14:00:11:22 - status 1
*Jun 12 11:22:45.001: %RRM-6-RADAR_DETECTED: Radar signals have been detected on channel 100`);
    };

    const loadRadiologicalSample = () => {
        setLogs(`! -- WLC RADIOACTIVE TRACE START --
[capwap-sm] [wncd]: MAC: 70db.9812.34ab Join Request received from 10.10.10.51
[capwap-sm] [wncd]: MAC: 70db.9812.34ab CAPWAP SM State: Join -> Image
[capwap-image] [wncd]: MAC: 70db.9812.34ab Starting Image download to AP
[capwap-image] [wncd]: MAC: 70db.9812.34ab Sending Image Data Packet #1 (Size: 1450)
[capwap-image] [wncd]: MAC: 70db.9812.34ab Sending Image Data Packet #2 (Size: 1450)
[capwap-sm] [wncd]: MAC: 70db.9812.34ab Retransmission timeout for Image Data
[capwap-sm] [wncd]: MAC: 70db.9812.34ab Maximum retransmissions reached
[capwap-sm] [wncd]: MAC: 70db.9812.34ab CAPWAP SM State: Image -> Idle
[capwap-sm] [wncd]: MAC: 70db.9812.34ab %CAPWAPAC_SMGR_TRACE_MESSAGE-3-EWLC_GEN_ERR: AP 70db.9812.34ab failed to acknowledge image data
! -- TRACE END --`);
    };

    const thoughtIcons = [
        <Search className="w-4 h-4" />,
        <Database className="w-4 h-4" />,
        <Cpu className="w-4 h-4" />,
        <CheckCircle2 className="w-4 h-4" />
    ];

    return (
        <div className="flex flex-col h-full gap-8 max-w-6xl mx-auto pb-6 overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
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
                        onClick={loadRadiologicalSample}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-brand-muted hover:text-slate-900 transition-colors uppercase tracking-widest border border-brand-border rounded-xl"
                    >
                        <TerminalIcon className="w-3.5 h-3.5" /> Trace Sample
                    </button>
                    <button
                        onClick={clearLogs}
                        className="flex items-center gap-2 px-4 py-2 text-[10px] font-black text-brand-muted hover:text-brand-red transition-colors uppercase tracking-widest"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0 overflow-hidden">
                {/* Left Side: Log Ingestion */}
                <div className="flex flex-col gap-4 min-h-0 h-full">
                    <div className="flex items-center gap-2 px-5 py-3 bg-slate-900 border border-slate-800 rounded-t-2xl border-b-0 shrink-0">
                        <TerminalIcon className="w-4 h-4 text-brand-orange" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">AIREOS_SYSLOG_INPUT</span>
                    </div>
                    <div className="relative flex-1 min-h-0 shadow-xl">
                        <textarea
                            value={logs}
                            onChange={(e) => setLogs(e.target.value)}
                            placeholder="Paste Cisco WLC/AP logs here..."
                            className="w-full h-full terminal bg-[#0f172a] border-slate-800 resize-none focus:outline-none focus:border-brand-orange/30 p-8 rounded-b-2xl font-mono text-sm"
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
                <div className="flex flex-col gap-4 min-h-0 h-full">
                    <div className="flex items-center gap-2 px-5 py-3 bg-white border border-brand-border rounded-2xl shrink-0 shadow-sm">
                        <BrainCircuit className="w-4 h-4 text-brand-orange" />
                        <span className="text-[10px] font-black text-slate-900 tracking-[0.2em] uppercase">RASA_INSIGHT_LOGIC</span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
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
