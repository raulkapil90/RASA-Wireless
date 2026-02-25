import React, { useState } from 'react';
import { configAuditor } from '../services/configAuditor';
import {
    Stethoscope,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    XCircle,
    Copy,
    Trash2,
    Play
} from 'lucide-react';

export default function ConfigDoctor() {
    const [config, setConfig] = useState('');
    const [isAuditing, setIsAuditing] = useState(false);
    const [findings, setFindings] = useState([]);

    const handleAudit = async () => {
        if (!config.trim()) return;

        setIsAuditing(true);
        // Simulate a small delay for "processing" feel
        setTimeout(() => {
            const results = configAuditor.checkBestPractices(config);
            setFindings(results);
            setIsAuditing(false);
        }, 600);
    };

    const clearConfig = () => {
        setConfig('');
        setFindings([]);
    };

    const copyRemediation = (cmd) => {
        navigator.clipboard.writeText(cmd);
        // Optional: show toast
    };

    return (
        <div className="flex flex-col h-full gap-6 max-w-7xl mx-auto pb-6 overflow-hidden">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 shrink-0 pt-2">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight uppercase flex items-center gap-3">
                        <Stethoscope className="w-8 h-8 text-brand-orange" />
                        Config Doctor
                    </h1>
                    <p className="text-brand-muted font-medium">
                        Automated WLC Configuration Auditor & Best Practice Analyzer.
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={clearConfig}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-black text-brand-muted hover:text-brand-red transition-colors uppercase tracking-widest border border-brand-border rounded-xl"
                    >
                        <Trash2 className="w-3.5 h-3.5" /> Clear
                    </button>
                    <button
                        onClick={() => setConfig(`wlan Corporate 1
 security wpa akm dot1x
 no ft
!
ap profile HighDensity
 dot11 5ghz data-rate 1.0 enable
 dot11 5ghz data-rate 12.0 mandatory
!
ap profile Warehouse
 dot11 5ghz rrm tpc-threshold-min -20
!`)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-black text-brand-muted hover:text-slate-900 transition-colors uppercase tracking-widest border border-brand-border rounded-xl"
                    >
                        <Copy className="w-3.5 h-3.5" /> Load Sample
                    </button>
                </div>
            </div>

            {/* Main Content - Dual Pane */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0 overflow-hidden">

                {/* Left Pane: Config Input */}
                <div className="flex flex-col gap-4 min-h-0 h-full">
                    <div className="flex items-center gap-2 px-5 py-3 bg-slate-900 border border-slate-800 rounded-t-2xl border-b-0 shrink-0">
                        <ShieldCheck className="w-4 h-4 text-brand-orange" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">IOS-XE_CONFIG_INPUT</span>
                    </div>
                    <div className="relative flex-1 min-h-0 shadow-xl">
                        <textarea
                            value={config}
                            onChange={(e) => setConfig(e.target.value)}
                            placeholder="Paste 'show run' or specific 'wlan/ap profile' blocks here..."
                            className="w-full h-full terminal bg-[#0f172a] border-slate-800 resize-none focus:outline-none focus:border-brand-orange/30 p-8 rounded-b-2xl font-mono text-xs leading-relaxed text-slate-300"
                            spellCheck="false"
                        />
                        {config && !isAuditing && (
                            <button
                                onClick={handleAudit}
                                className="absolute bottom-8 right-8 btn-primary px-8 py-4 flex items-center gap-3 shadow-xl shadow-brand-orange/40 animate-in fade-in zoom-in duration-300"
                            >
                                <Play className="w-5 h-5 fill-current" />
                                Run Audit
                            </button>
                        )}
                        {isAuditing && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center rounded-b-2xl">
                                <div className="flex flex-col items-center gap-4 animate-pulse">
                                    <Stethoscope className="w-12 h-12 text-brand-orange" />
                                    <span className="text-brand-orange font-black tracking-widest uppercase text-xs">Analyzing Configuration...</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Pane: Findings */}
                <div className="flex flex-col gap-4 min-h-0 h-full">
                    <div className="flex items-center gap-2 px-5 py-3 bg-white border border-brand-border rounded-2xl shrink-0 shadow-sm">
                        <CheckCircle2 className="w-4 h-4 text-brand-orange" />
                        <span className="text-[10px] font-black text-slate-900 tracking-[0.2em] uppercase">AUDIT_FINDINGS</span>
                        <span className="ml-auto text-[10px] font-bold text-brand-muted bg-slate-100 px-2 py-0.5 rounded-full">
                            {findings.length} ISSUES FOUND
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {findings.length > 0 ? (
                            findings.map((finding, idx) => (
                                <div key={idx} className="bg-white border border-brand-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {finding.severity === 'HIGH' ? (
                                                <div className="bg-red-50 text-red-600 p-1.5 rounded-lg">
                                                    <XCircle className="w-4 h-4" />
                                                </div>
                                            ) : (
                                                <div className="bg-orange-50 text-orange-600 p-1.5 rounded-lg">
                                                    <AlertTriangle className="w-4 h-4" />
                                                </div>
                                            )}
                                            <div>
                                                <span className={`text-[10px] font-black uppercase tracking-wider ${finding.severity === 'HIGH' ? 'text-red-600' : 'text-orange-600'
                                                    }`}>
                                                    {finding.severity} SEVERITY
                                                </span>
                                                <h3 className="text-sm font-bold text-slate-900">{finding.issue}</h3>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-brand-muted bg-slate-50 px-2 py-1 rounded border border-slate-100 uppercase tracking-wide">
                                            {finding.category}
                                        </span>
                                    </div>

                                    <div className="pl-9 space-y-3">
                                        <p className="text-xs text-slate-600 leading-relaxed">
                                            <span className="font-bold text-slate-900">Impact: </span>
                                            {finding.impact}
                                        </p>

                                        <div className="bg-slate-900 rounded-lg p-3 group/code relative mt-2">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover/code:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => copyRemediation(finding.remediation_cmd)}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
                                                    title="Copy Command"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <span className="text-[10px] font-bold text-brand-orange uppercase tracking-wider mb-1 block">Remediation Command</span>
                                            <code className="font-mono text-xs text-brand-green block break-all">
                                                {finding.remediation_cmd}
                                            </code>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-brand-border rounded-3xl bg-white shadow-inner">
                                <div className="bg-brand-orange/5 p-6 rounded-3xl mb-6 ring-1 ring-brand-orange/10">
                                    <Stethoscope className="w-10 h-10 text-brand-orange" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2 tracking-tight">Ready to Audit</h3>
                                <p className="text-sm text-brand-muted max-w-xs font-medium leading-relaxed">
                                    Paste your configuration on the left to scan for best practice violations.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
