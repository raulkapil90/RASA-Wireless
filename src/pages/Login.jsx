import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RasaLogoPrecise, RasaBrand } from '../components/RasaLogo';
import { Lock, User, AlertCircle, ArrowRight } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const from = location.state?.from?.pathname || "/";

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (login(username, password)) {
            navigate(from, { replace: true });
        } else {
            setError('Invalid username or password');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-blue/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="w-full max-w-[420px] space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex flex-col items-center text-center">
                    <div className="bg-brand-orange w-20 h-20 rounded-3xl shadow-2xl shadow-brand-orange/40 flex items-center justify-center text-white mb-6">
                        <RasaLogoPrecise className="w-14 h-14" color="white" />
                    </div>
                    <RasaBrand />
                </div>

                <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-xl shadow-slate-200/50 border border-slate-100">
                    <div className="mb-8">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight">Security Access</h2>
                        <p className="text-brand-muted text-sm font-medium mt-1">Please enter your RASA credentials.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] ml-1">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-brand-orange transition-colors" />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder:text-brand-muted/40 focus:outline-none focus:ring-4 focus:ring-brand-orange/5 focus:border-brand-orange focus:bg-white transition-all font-medium"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-muted group-focus-within:text-brand-orange transition-colors" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-slate-900 placeholder:text-brand-muted/40 focus:outline-none focus:ring-4 focus:ring-brand-orange/5 focus:border-brand-orange focus:bg-white transition-all font-medium"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 p-4 bg-brand-red/5 border border-brand-red/10 rounded-2xl text-brand-red text-xs font-bold animate-in shake duration-300">
                                <AlertCircle className="w-4 h-4" />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="w-full py-5 bg-brand-orange text-white rounded-2xl font-black text-sm tracking-widest uppercase shadow-xl shadow-brand-orange/30 hover:bg-brand-orange/90 active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
                        >
                            Authorize Access
                            <ArrowRight className="w-5 h-5" />
                        </button>
                    </form>
                </div>

                <p className="text-center text-[10px] font-bold text-brand-muted uppercase tracking-[0.3em]">
                    &copy; 2026 RASA WIRELESS INFRASTRUCTURE
                </p>
            </div>
        </div>
    );
}
