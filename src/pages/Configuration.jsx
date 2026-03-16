import React, { useState, useEffect } from 'react';
import {
    Cpu, Network, Server, Cloud, Shield, Settings2, Plus, ArrowRight, CheckCircle2, AlertCircle, PlayCircle
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";
const API_BASE = `${API_BASE_URL}/config`;

const VENDOR_ROLES = {
    "Cisco": ["Core Switch", "Edge Switch", "WLC"],
    "Arista": ["Data Center Leaf", "Data Center Spine"],
    "Palo Alto": ["Edge NGFW", "Data Center Firewall"],
    "F5": ["Local Traffic Manager (LTM)", "Global Traffic Manager (GTM)"],
    "Meraki": ["Cloud Managed Switch", "Cloud Managed AP", "Security Appliance (MX)"]
};

export default function Configuration() {
    const [activeTab, setActiveTab] = useState('devices');
    const [devices, setDevices] = useState([]);

    // Wizard State
    const [showWizard, setShowWizard] = useState(false);
    const [step, setStep] = useState(1);
    const [newDevice, setNewDevice] = useState({
        hostname: '', management_ip: '', vendor: '', role: '', credential_profile_id: '', monitoring_profile_id: '', tags: {}
    });

    // Validation State
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState(null);

    // Live Database Profiles
    const [credProfiles, setCredProfiles] = useState([]);
    const [monProfiles, setMonProfiles] = useState([]);

    useEffect(() => {
        // Fetch Devices
        fetch(`${API_BASE}/devices`)
            .then(res => res.json())
            .then(data => setDevices(data))
            .catch(err => console.error("Error fetching devices", err));

        // Fetch Credential Profiles
        fetch(`${API_BASE}/profiles/credential`)
            .then(res => res.json())
            .then(data => setCredProfiles(data))
            .catch(err => console.error("Error fetching cred profiles", err));

        // Fetch Monitoring Profiles
        fetch(`${API_BASE}/profiles/monitoring`)
            .then(res => res.json())
            .then(data => setMonProfiles(data))
            .catch(err => console.error("Error fetching mon profiles", err));
    }, []);

    const handleValidate = async () => {
        setIsValidating(true);
        try {
            const res = await fetch(`${API_BASE}/devices/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newDevice)
            });
            const data = await res.json();
            setValidationResult(data);
        } catch (err) {
            setValidationResult({ valid: false, error: "Validator API Unreachable" });
        }
        setIsValidating(false);
    };

    const handleSaveDevice = async () => {
        try {
            const response = await fetch(`${API_BASE}/devices`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newDevice)
            });
            if (response.ok) {
                const savedItem = await response.json();
                setDevices([...devices, savedItem]);
                setShowWizard(false);
                setStep(1);
                setValidationResult(null);
                setNewDevice({ hostname: '', management_ip: '', vendor: '', role: '', credential_profile_id: '', monitoring_profile_id: '', tags: {} });
            }
        } catch (err) {
            console.error("Failed to save device", err);
        }
    };

    const renderWizardStep1 = () => (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-slate-800">1. Asset Genesis</h3>
            <p className="text-sm text-slate-500 mb-6">Define the identity and physical/logical role of this asset.</p>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Management IP / FQDN</label>
                    <input type="text" className="w-full text-slate-800 bg-slate-100/50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                        placeholder="10.254.1.100"
                        value={newDevice.management_ip} onChange={e => setNewDevice({ ...newDevice, management_ip: e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">System Hostname</label>
                    <input type="text" className="w-full text-slate-800 bg-slate-100/50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                        placeholder="lon-core-sw01"
                        value={newDevice.hostname} onChange={e => setNewDevice({ ...newDevice, hostname: e.target.value })} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Hardware Vendor</label>
                    <select className="w-full text-slate-800 bg-slate-100/50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                        value={newDevice.vendor} onChange={e => setNewDevice({ ...newDevice, vendor: e.target.value, role: '' })}>
                        <option value="">Select Vendor...</option>
                        {Object.keys(VENDOR_ROLES).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Device Role</label>
                    <select className="w-full text-slate-800 bg-slate-100/50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                        disabled={!newDevice.vendor}
                        value={newDevice.role} onChange={e => setNewDevice({ ...newDevice, role: e.target.value })}>
                        <option value="">Select Role...</option>
                        {(VENDOR_ROLES[newDevice.vendor] || []).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                </div>
            </div>

            <div className="flex justify-end pt-6">
                <button
                    disabled={!newDevice.management_ip || !newDevice.vendor || !newDevice.role}
                    onClick={() => setStep(2)}
                    className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                    Next: Assignment <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );

    const renderWizardStep2 = () => {
        // Dynamic protocol inference text based on architectural logic
        let protocolHint = "Select standard profiles.";
        if (["Cisco", "Arista"].includes(newDevice.vendor)) protocolHint = "Hardware-Centric: Requires SSH/CLI and SNMP/gNMI configurations.";
        if (["Palo Alto", "F5"].includes(newDevice.vendor)) protocolHint = "App/Security-Centric: Requires REST API Token configurations.";
        if (newDevice.vendor === "Meraki") protocolHint = "Cloud/SDN: Requires Controller API OAuth configurations.";

        return (
            <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                <h3 className="text-xl font-bold text-slate-800 flex items-center justify-between">
                    2. Global Profile Assignment
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-3 py-1 rounded-full">{protocolHint}</span>
                </h3>
                <p className="text-sm text-slate-500 mb-6">Map this device to existing reusable security and telemetry policies.</p>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Credential Profile (Authentication)</label>
                        <select className="w-full text-slate-800 bg-slate-100/50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                            value={newDevice.credential_profile_id} onChange={e => setNewDevice({ ...newDevice, credential_profile_id: e.target.value })}>
                            <option value="">Select a Credential Profile...</option>
                            {credProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">Monitoring Profile (Telemetry Frequency)</label>
                        <select className="w-full text-slate-800 bg-slate-100/50 border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
                            value={newDevice.monitoring_profile_id} onChange={e => setNewDevice({ ...newDevice, monitoring_profile_id: e.target.value })}>
                            <option value="">Select a Monitoring Profile...</option>
                            {monProfiles.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-between pt-6">
                    <button onClick={() => setStep(1)} className="text-slate-500 font-semibold hover:text-slate-700">Back</button>
                    <button
                        disabled={!newDevice.credential_profile_id || !newDevice.monitoring_profile_id}
                        onClick={() => setStep(3)}
                        className="flex items-center gap-2 bg-brand-blue text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50">
                        Next: Metadata <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    };

    const renderWizardStep3 = () => (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
            <h3 className="text-xl font-bold text-slate-800">3. AI Context Metadata</h3>
            <p className="text-sm text-slate-500 mb-6">Tagging provides spatial and business context to the NetOps AI for intelligent escalation mapping.</p>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Site Location / Rack</label>
                    <input type="text" className="w-full text-slate-800 bg-slate-100/50 border border-slate-200 rounded-lg px-4 py-3"
                        placeholder="London DC - Rack 42"
                        onChange={e => setNewDevice({ ...newDevice, tags: { ...newDevice.tags, siteLocation: e.target.value } })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Business Criticality</label>
                    <select className="w-full text-slate-800 bg-slate-100/50 border border-slate-200 rounded-lg px-4 py-3"
                        onChange={e => setNewDevice({ ...newDevice, tags: { ...newDevice.tags, businessCriticality: e.target.value } })}>
                        <option value="">Select Tier...</option>
                        <option value="Tier 1">Tier 1 (Mission Critical)</option>
                        <option value="Tier 2">Tier 2 (Standard Prod)</option>
                        <option value="Tier 3">Tier 3 (Dev / Test)</option>
                    </select>
                </div>
            </div>

            <div className="mt-8 bg-slate-50 rounded-xl border border-slate-200 p-6">
                <h4 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Shield size={16} /> Pre-Commit Validation Engine
                </h4>

                {!validationResult ? (
                    <button
                        onClick={handleValidate}
                        disabled={isValidating}
                        className="flex items-center justify-center gap-2 w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors">
                        {isValidating ? "Testing Connectivity & Capabilities..." : <><PlayCircle size={18} /> Run Validation Check</>}
                    </button>
                ) : (
                    <div className={`p-4 rounded-lg flex gap-3 ${validationResult.valid ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        {validationResult.valid ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
                        <div>
                            <p className="font-bold text-sm">{validationResult.valid ? "Validation Passed" : "Validation Failed"}</p>
                            <p className="text-sm mt-1">{validationResult.message || validationResult.error}</p>

                            {validationResult.valid && (
                                <button
                                    onClick={handleSaveDevice}
                                    className="mt-4 bg-green-600 text-white px-6 py-2 rounded-md font-semibold hover:bg-green-700 text-sm">
                                    Commit Device to Engine
                                </button>
                            )}
                            {!validationResult.valid && (
                                <button
                                    onClick={() => setValidationResult(null)}
                                    className="mt-4 bg-white border border-red-300 text-red-700 px-6 py-2 rounded-md font-semibold hover:bg-red-50 text-sm">
                                    Retry Validation
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-200 mt-6">
                <button onClick={() => setStep(2)} className="text-slate-500 font-semibold hover:text-slate-700">Back</button>
            </div>
        </div>
    );

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-3">
                    <Settings2 className="text-brand-orange" size={32} />
                    Configuration & Onboarding
                </h1>
                <p className="text-slate-500 text-sm font-medium mt-1 tracking-wide uppercase">
                    Profile-Based Multi-Vendor Infrastructure Management.
                </p>
            </header>

            {/* Dashboard Navigation */}
            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                <button onClick={() => setActiveTab('devices')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'devices' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    Managed Devices ({devices.length})
                </button>
                <button onClick={() => setActiveTab('profiles')} className={`px-6 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'profiles' ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    Global Profiles
                </button>
            </div>

            {/* Asset Table / Empty State */}
            {activeTab === 'devices' && !showWizard && (
                <div className="bg-white border border-slate-200/60 rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h2 className="text-lg font-bold text-slate-800">Device Inventory</h2>
                        <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 bg-brand-blue text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-brand-blue/20">
                            <Plus size={18} /> Onboard Device
                        </button>
                    </div>

                    {devices.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-xl">
                                <Server className="text-slate-400" size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-700 mb-2">No infrastructure onboarded yet.</h3>
                            <p className="text-slate-500 max-w-md mx-auto">Use the Universal Onboarding Wizard to add Switches, Firewalls, WLCs, or SD-WAN gateways.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Hostname / IP</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Vendor & Role</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Telemitry</th>
                                        <th className="px-6 py-4 font-bold border-b border-slate-100">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {devices.map(dev => (
                                        <tr key={dev.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-slate-800">{dev.hostname}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-1">{dev.management_ip}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    {dev.vendor === 'Cisco' && <Network size={14} className="text-blue-500" />}
                                                    {dev.vendor === 'Palo Alto' && <Shield size={14} className="text-orange-500" />}
                                                    {dev.vendor === 'Meraki' && <Cloud size={14} className="text-green-500" />}
                                                    <span className="text-sm font-semibold text-slate-700">{dev.vendor}</span>
                                                </div>
                                                <p className="text-xs text-slate-500 mt-1">{dev.role}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs font-semibold px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                                    {monProfiles.find(p => p.id === dev.monitoring_profile_id)?.name.split(' ')[0] || "Standard"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Universal Wizard Modal/View */}
            {showWizard && (
                <div className="bg-white border border-slate-200/60 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="flex">
                        {/* Sidebar Progress */}
                        <div className="w-64 bg-slate-50 p-8 border-r border-slate-100 shrink-0">
                            <h2 className="text-sm font-black tracking-widest text-brand-orange mb-8 uppercase">Device Builder</h2>
                            <div className="space-y-6">
                                <div className={`flex items-center gap-3 ${step >= 1 ? 'text-brand-blue' : 'text-slate-400'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 1 ? 'bg-brand-blue text-white' : 'bg-slate-200'}`}>1</div>
                                    <span className="font-semibold text-sm">Asset Genesis</span>
                                </div>
                                <div className={`flex items-center gap-3 ${step >= 2 ? 'text-brand-blue' : 'text-slate-400'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 2 ? 'bg-brand-blue text-white' : 'bg-slate-200'}`}>2</div>
                                    <span className="font-semibold text-sm">Config Profiles</span>
                                </div>
                                <div className={`flex items-center gap-3 ${step >= 3 ? 'text-brand-blue' : 'text-slate-400'}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${step >= 3 ? 'bg-brand-blue text-white' : 'bg-slate-200'}`}>3</div>
                                    <span className="font-semibold text-sm">Tags & Validate</span>
                                </div>
                            </div>
                        </div>

                        {/* Active Pane */}
                        <div className="p-8 flex-1 min-h-[500px]">
                            {step === 1 && renderWizardStep1()}
                            {step === 2 && renderWizardStep2()}
                            {step === 3 && renderWizardStep3()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

