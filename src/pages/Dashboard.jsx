import React from 'react';
import { Link } from 'react-router-dom';
import {
    Wrench,
    Activity,
    Command,
    ChevronRight,
    ShieldCheck,
    Zap,
    Sparkles
} from 'lucide-react';

const ServiceCard = ({ title, description, icon: Icon, colorClass, path }) => (
    <div className="card group hover:border-brand-orange/50 transition-all duration-300 flex flex-col items-center text-center p-10 h-full">
        <div className={`p-5 rounded-2xl mb-8 transition-transform group-hover:scale-110 duration-300 ${colorClass} text-white shadow-lg`}>
            <Icon className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-brand-orange transition-colors">
            {title}
        </h3>
        <p className="text-brand-muted text-sm leading-relaxed mb-10 flex-1">
            {description}
        </p>
        <Link
            to={path}
            className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-brand-muted hover:text-brand-orange transition-colors uppercase"
        >
            Launch Tool
            <ChevronRight className="w-4 h-4" />
        </Link>
    </div>
);

export default function Dashboard() {
    return (
        <div className="max-w-6xl mx-auto py-10 space-y-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Hero Section */}
            <div className="text-center space-y-6">
                <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none">
                    Welcome to <span className="text-brand-orange">NetOps AI</span> Assistant
                </h1>
                <p className="text-lg text-brand-muted font-medium max-w-2xl mx-auto">
                    Select a service below to begin troubleshooting your network infrastructure.
                </p>
            </div>

            {/* Service Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <ServiceCard
                    title="Log Analysis & Remediation"
                    description="AI-powered log parser for Cisco, Aruba, and Ruckus. Identifies root causes and suggests fixes."
                    icon={Wrench}
                    colorClass="bg-brand-orange shadow-brand-orange/20"
                    path="/analysis"
                />
                <ServiceCard
                    title="Recent Incidents"
                    description="View live network alerts, active remediations, and historical issue logs."
                    icon={Activity}
                    colorClass="bg-brand-red shadow-brand-red/20"
                    path="/issues"
                />
                <ServiceCard
                    title="CLI Translator"
                    description="Map configuration commands across different network vendors instantly."
                    icon={Command}
                    colorClass="bg-brand-blue shadow-brand-blue/20"
                    path="/translator"
                />
            </div>

            {/* System Status Bar */}
            <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl shadow-slate-900/10">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                        <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    </div>
                    <div>
                        <h4 className="text-xl font-bold text-white tracking-tight">System Status: Optimal</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <Sparkles className="w-3.5 h-3.5 text-brand-orange" />
                            <p className="text-sm text-slate-400 font-medium">All AI models are running with 99.9% uptime.</p>
                        </div>
                    </div>
                </div>
                <button className="w-full sm:w-auto px-8 py-4 bg-white/10 text-white rounded-2xl font-bold text-sm tracking-tight hover:bg-white/15 transition-all border border-white/5 flex items-center justify-center gap-3">
                    <Zap className="w-4 h-4 text-brand-orange fill-brand-orange" />
                    Run Health Check
                </button>
            </div>
        </div>
    );
}
