import React from 'react';
import { Link } from 'react-router-dom';
import {
    Wrench,
    Activity,
    Command,
    Stethoscope,
    ChevronRight,
    ShieldCheck,
    Zap,
    Sparkles,
    Shield,
    Database,
    Ticket,
    Cloud,
    Monitor
} from 'lucide-react';

const ServiceCard = ({ title, description, icon: Icon, colorClass, path }) => (
    <Link to={path} className="card group hover:border-brand-orange/50 transition-all duration-300 flex flex-col items-center text-center p-10 h-full cursor-pointer hover:shadow-xl hover:shadow-brand-orange/5">
        <div className={`p-5 rounded-2xl mb-8 transition-transform group-hover:scale-110 duration-300 ${colorClass} text-white shadow-lg`}>
            <Icon className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight group-hover:text-brand-orange transition-colors uppercase">
            {title}
        </h3>
        <p className="text-brand-muted text-sm leading-relaxed mb-6 flex-1">
            {description}
        </p>
        <div className="inline-flex items-center gap-2 text-[10px] font-black tracking-[0.2em] text-brand-muted group-hover:text-brand-orange transition-colors uppercase mt-auto">
            Open Tool
            <ChevronRight className="w-4 h-4" />
        </div>
    </Link>
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
                    title="Config Doctor"
                    description="Automated WLC Configuration Auditor & Best Practice Analyzer. Scan for RF risks and misconfigs."
                    icon={Stethoscope}
                    colorClass="bg-brand-blue shadow-brand-blue/20"
                    path="/config-doctor"
                />
                <ServiceCard
                    title="Catalyst Bridge"
                    description="Live CCC issue feed with Narrative Intelligence and Human-in-the-Loop remediation workflows."
                    icon={Shield}
                    colorClass="bg-violet-600 shadow-violet-600/20"
                    path="/catalyst-bridge"
                />
                <ServiceCard
                    title="IPAM Forecast"
                    description="Predictive IP Pool Capacity Engine. Forecast DHCP scope exhaustion before it impacts users."
                    icon={Database}
                    colorClass="bg-cyan-600 shadow-cyan-600/20"
                    path="/ipam-forecast"
                />
            </div>

            {/* Integrations Section */}
            <div>
                <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6">3rd Party Integrations</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <ServiceCard
                        title="Jira Tickets"
                        description="Network Operations ticket queue from Jira Cloud. Create and track incidents directly from this platform."
                        icon={Ticket}
                        colorClass="bg-blue-600 shadow-blue-600/20"
                        path="/jira"
                    />
                    <ServiceCard
                        title="Salesforce Cases"
                        description="Live Network Cases from your Salesforce org. Filter by Category=Network and open records natively."
                        icon={Cloud}
                        colorClass="bg-sky-500 shadow-sky-500/20"
                        path="/salesforce"
                    />
                    <ServiceCard
                        title="External Dashboards"
                        description="iFrame-embed any external monitoring tool — Grafana, Kibana, Datadog, PagerDuty, Zabbix."
                        icon={Monitor}
                        colorClass="bg-slate-600 shadow-slate-600/20"
                        path="/external-dashboards"
                    />
                </div>
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
