import React, { useState } from 'react';
import { commands } from '../data/commands';
import {
    Search,
    Terminal,
    SwitchCamera,
    Layers,
    ChevronRight,
    Info
} from 'lucide-react';

export default function CliTranslator() {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredCommands = commands.filter(cmd =>
        cmd.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmd.cisco.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmd.aruba.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cmd.ruckus.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-12 max-w-5xl mx-auto py-6">
            <div className="text-center space-y-6">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">CLI Multi-Vendor Translator</h1>
                <p className="text-brand-muted font-medium max-w-xl mx-auto">
                    Bridging the gap between Cisco IOS-XE, ArubaOS, and Ruckus SmartZone syntax instantly.
                </p>
            </div>

            <div className="relative group max-w-2xl mx-auto">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-brand-orange transition-colors" />
                <input
                    type="text"
                    placeholder="Search commands (e.g. 'show ap', 'client info')..."
                    className="w-full pl-14 pr-6 py-5 bg-white border border-brand-border rounded-2xl text-slate-900 placeholder:text-brand-muted/50 focus:outline-none focus:ring-4 focus:ring-brand-orange/5 focus:border-brand-orange transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredCommands.length > 0 ? (
                    filteredCommands.map((cmd, idx) => (
                        <div key={idx} className="card p-0 overflow-hidden group hover:border-brand-orange/30 transition-all shadow-sm hover:shadow-md">
                            <div className="p-4 border-b border-brand-border bg-slate-50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded-lg border border-brand-border">
                                        <Layers className="w-4 h-4 text-brand-orange" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 uppercase tracking-widest text-[10px]">{cmd.description}</h3>
                                </div>
                                <Info className="w-4 h-4 text-brand-muted cursor-help" />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-brand-border">
                                {/* Cisco */}
                                <div className="p-8 space-y-4 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] block">Cisco (WLC)</span>
                                    <div className="font-mono bg-slate-900 text-brand-orange px-4 py-3 rounded-xl font-bold text-xs ring-1 ring-slate-800">
                                        {cmd.cisco}
                                    </div>
                                </div>

                                {/* Aruba */}
                                <div className="p-8 space-y-4 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] block">Aruba (AOS)</span>
                                    <div className="font-mono bg-slate-900 text-brand-blue px-4 py-3 rounded-xl font-bold text-xs ring-1 ring-slate-800">
                                        {cmd.aruba}
                                    </div>
                                </div>

                                {/* Ruckus */}
                                <div className="p-8 space-y-4 hover:bg-slate-50/50 transition-colors">
                                    <span className="text-[10px] font-bold text-brand-muted uppercase tracking-[0.2em] block">Ruckus (SZ)</span>
                                    <div className="font-mono bg-slate-900 text-brand-green px-4 py-3 rounded-xl font-bold text-xs ring-1 ring-slate-800">
                                        {cmd.ruckus}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-24 opacity-60">
                        <div className="bg-slate-50 inline-block p-8 rounded-full border-2 border-dashed border-brand-border mb-6">
                            <Search className="w-12 h-12 text-brand-muted" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2">No results found</h3>
                        <p className="text-brand-muted font-medium">Try specialized terms or contribute to RASA's logic.</p>
                    </div>
                )}
            </div>

            <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-3xl p-8 flex items-start gap-6">
                <div className="bg-brand-orange p-3 rounded-2xl shrink-0 text-white shadow-lg shadow-brand-orange/20">
                    <SwitchCamera className="w-6 h-6" />
                </div>
                <div>
                    <h4 className="font-black text-slate-900 mb-2 tracking-tight">Multi-Vendor Intelligence</h4>
                    <p className="text-sm text-brand-muted leading-relaxed font-medium">
                        RASA Multi-Vendor Sync supports Catalyst, ArubaOS, and SmartZone out of the box. AI-driven translations for Mist and Meraki are currently in beta.
                    </p>
                </div>
            </div>
        </div>
    );
}
