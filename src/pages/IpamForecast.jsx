import React, { useState, useEffect } from 'react';
import {
    Database, TrendingUp, TrendingDown, Minus, AlertTriangle,
    CheckCircle2, RefreshCw, Gauge, Clock, Shield
} from 'lucide-react';
import { fetchIpamForecast } from '../services/cccApi';

const riskConfig = {
    CRITICAL: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', bar: 'bg-red-500' },
    HIGH: { color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', bar: 'bg-orange-500' },
    MEDIUM: { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', bar: 'bg-yellow-500' },
    LOW: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', bar: 'bg-emerald-500' },
};

const trendIcon = {
    growing: TrendingUp,
    stable: Minus,
    shrinking: TrendingDown,
};

function PoolCard({ forecast }) {
    const risk = riskConfig[forecast.risk_level] || riskConfig.LOW;
    const TrendIcon = trendIcon[forecast.trend] || Minus;
    const utilizationWidth = Math.min(forecast.current_utilization_pct, 100);

    return (
        <div className={`card ${risk.bg} ${risk.border} border shadow-lg hover:shadow-xl transition-all duration-300`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${risk.bar} text-white`}>
                        <Database className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">{forecast.pool_name}</h3>
                        <p className="text-[11px] text-slate-400 font-bold font-mono">{forecast.pool_cidr}</p>
                    </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${risk.color} ${risk.bg} border ${risk.border}`}>
                    {forecast.risk_level}
                </span>
            </div>

            {/* Utilization Bar */}
            <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Utilization</span>
                    <span className="text-lg font-black text-slate-900">{forecast.current_utilization_pct}%</span>
                </div>
                <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-slate-200 shadow-inner">
                    <div
                        className={`h-full ${risk.bar} transition-all duration-1000 rounded-full`}
                        style={{ width: `${utilizationWidth}%` }}
                    />
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-white/80 rounded-xl p-3 text-center border border-slate-200/60">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Used</p>
                    <p className="text-lg font-black text-slate-900">{forecast.used.toLocaleString()}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 text-center border border-slate-200/60">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Free</p>
                    <p className="text-lg font-black text-emerald-600">{forecast.free.toLocaleString()}</p>
                </div>
                <div className="bg-white/80 rounded-xl p-3 text-center border border-slate-200/60">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total</p>
                    <p className="text-lg font-black text-slate-900">{forecast.total.toLocaleString()}</p>
                </div>
            </div>

            {/* Forecast Row */}
            <div className="flex items-center justify-between bg-white/80 rounded-xl p-4 border border-slate-200/60">
                <div className="flex items-center gap-3">
                    <Clock className={`w-5 h-5 ${risk.color}`} />
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Time to Exhaustion</p>
                        <p className="text-xl font-black text-slate-900">
                            {forecast.days_to_exhaustion !== null
                                ? `${forecast.days_to_exhaustion} days`
                                : '∞ (Stable)'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <TrendIcon className={`w-5 h-5 ${forecast.trend === 'growing' ? 'text-red-500' :
                            forecast.trend === 'shrinking' ? 'text-emerald-500' : 'text-slate-400'
                        }`} />
                    <span className="text-[10px] font-black text-slate-400 uppercase">{forecast.trend}</span>
                </div>
            </div>

            {/* Confidence */}
            {forecast.confidence > 0 && (
                <div className="mt-3 flex items-center gap-2 justify-end">
                    <Gauge className="w-3 h-3 text-slate-300" />
                    <span className="text-[10px] text-slate-400 font-bold">
                        Confidence: {Math.round(forecast.confidence * 100)}%
                    </span>
                </div>
            )}
        </div>
    );
}

export default function IpamForecast() {
    const [forecasts, setForecasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadForecasts = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchIpamForecast();
            setForecasts(data.forecasts || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadForecasts(); }, []);

    // Summary stats
    const criticalPools = forecasts.filter(f => f.risk_level === 'CRITICAL').length;
    const highPools = forecasts.filter(f => f.risk_level === 'HIGH').length;
    const healthyPools = forecasts.filter(f => f.risk_level === 'LOW').length;

    return (
        <div className="max-w-6xl mx-auto py-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        IPAM <span className="text-brand-orange">Forecast</span>
                    </h1>
                    <p className="text-brand-muted font-medium mt-1">
                        Predictive IP Pool Capacity Engine · Linear Regression
                    </p>
                </div>
                <button
                    onClick={loadForecasts}
                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-brand-orange transition-colors flex items-center gap-2"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </button>
            </div>

            {/* Summary Bar */}
            {forecasts.length > 0 && (
                <div className="bg-slate-900 rounded-3xl p-6 flex items-center justify-between shadow-2xl shadow-slate-900/10">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-brand-orange/10 rounded-2xl border border-brand-orange/20">
                            <Shield className="w-8 h-8 text-brand-orange" />
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-white tracking-tight">
                                {forecasts.length} IP Pools Monitored
                            </h4>
                            <div className="flex items-center gap-4 mt-1">
                                {criticalPools > 0 && (
                                    <span className="text-xs text-red-400 font-bold flex items-center gap-1">
                                        <AlertTriangle className="w-3 h-3" /> {criticalPools} Critical
                                    </span>
                                )}
                                {highPools > 0 && (
                                    <span className="text-xs text-orange-400 font-bold flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" /> {highPools} High Risk
                                    </span>
                                )}
                                {healthyPools > 0 && (
                                    <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3" /> {healthyPools} Healthy
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-red-700 font-bold text-sm">
                    {error}
                </div>
            )}

            {/* Loading */}
            {loading && !forecasts.length && (
                <div className="text-center py-20">
                    <RefreshCw className="w-8 h-8 text-brand-orange animate-spin mx-auto mb-4" />
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">
                        Loading IPAM Data...
                    </p>
                </div>
            )}

            {/* Pool Grid */}
            {!loading && forecasts.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {forecasts
                        .sort((a, b) => b.current_utilization_pct - a.current_utilization_pct)
                        .map((forecast, idx) => (
                            <PoolCard key={forecast.pool_name || idx} forecast={forecast} />
                        ))}
                </div>
            )}
        </div>
    );
}
