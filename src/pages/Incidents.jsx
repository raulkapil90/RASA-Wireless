import React, { useState } from 'react';
import { activeIssues } from '../data/issues';
import {
    AlertCircle,
    MapPin,
    Clock,
    Activity,
    ChevronDown,
    ChevronUp,
    ShieldCheck,
    Zap
} from 'lucide-react';

const SeverityBadge = ({ severity }) => {
    const colors = {
        critical: 'bg-brand-orange/10 text-brand-orange border-brand-orange/20',
        warning: 'bg-brand-amber/10 text-brand-amber border-brand-amber/20',
        info: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20'
    };
    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${colors[severity]}`}>
            {severity}
        </span>
    );
};

export default function Incidents() {
    const [expandedId, setExpandedId] = useState(activeIssues[0]?.id);

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div>
                <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Recent Incidents</h1>
                <p className="text-brand-muted font-medium">Real-time alerts and remediation paths detected by RASA AI.</p>
            </div>

            <div className="space-y-4">
                {activeIssues.map((issue) => (
                    <div
                        key={issue.id}
                        className={`card overflow-hidden transition-all duration-300 ${expandedId === issue.id ? 'ring-2 ring-brand-orange/20 border-brand-orange/30 shadow-md' : 'hover:border-slate-300 shadow-sm'}`}
                    >
                        <div
                            className="flex items-center justify-between cursor-pointer p-1"
                            onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                        >
                            <div className="flex items-center gap-6 min-w-0">
                                <SeverityBadge severity={issue.severity} />
                                <div className="min-w-0">
                                    <h3 className="font-bold text-slate-900 truncate tracking-tight">{issue.title}</h3>
                                    <div className="flex items-center gap-4 mt-1">
                                        <span className="text-xs text-brand-muted font-medium flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5" /> {issue.location}
                                        </span>
                                        <span className="text-xs text-brand-muted font-medium flex items-center gap-1.5">
                                            <Clock className="w-3.5 h-3.5" /> {issue.timestamp}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 text-brand-muted hover:text-brand-orange transition-colors">
                                {expandedId === issue.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                            </button>
                        </div>

                        {expandedId === issue.id && (
                            <div className="mt-8 pt-8 border-t border-brand-border animate-in slide-in-from-top-4 duration-500">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <div>
                                            <h4 className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest">
                                                <Zap className="w-4 h-4 text-brand-orange" /> Evidence Analysis
                                            </h4>
                                            <div className="terminal p-6 bg-slate-900 border border-slate-800 text-sm leading-relaxed rounded-2xl italic">
                                                {issue.evidence}
                                            </div>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest">Device Impacted</h4>
                                            <p className="text-brand-orange text-xs px-4 py-2.5 bg-brand-orange/5 rounded-xl border border-brand-orange/10 uppercase tracking-widest font-black inline-block">
                                                {issue.device}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 className="flex items-center gap-2 text-xs font-bold text-slate-900 mb-4 uppercase tracking-widest">
                                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Step-by-Step Remediation
                                        </h4>
                                        <div className="space-y-4">
                                            {issue.remediation.map((step, idx) => (
                                                <div key={idx} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-brand-border group hover:border-brand-orange/20 transition-colors">
                                                    <div className="shrink-0 w-8 h-8 rounded-xl bg-brand-orange text-white text-xs flex items-center justify-center font-black shadow-lg shadow-brand-orange/20">
                                                        {idx + 1}
                                                    </div>
                                                    <p className="text-sm text-slate-700 leading-relaxed font-medium">{step}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 flex justify-end gap-3">
                                    <button className="px-6 py-3 text-sm font-bold text-brand-muted hover:text-slate-900 transition-colors">
                                        Snooze Alert
                                    </button>
                                    <button className="btn-primary px-8">
                                        Resolve Manually
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
