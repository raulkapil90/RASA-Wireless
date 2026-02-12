import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RasaLogoLockup } from './RasaLogo';
import {
    LayoutDashboard,
    Terminal,
    Search,
    AlertCircle,
    BookOpen,
    BarChart3,
    Settings,
    LogOut,
    Menu,
    X,
    Wifi,
    User,
    Bell,
    Search as SearchIcon
} from 'lucide-react';

const sidebarLinks = [
    {
        section: 'TOOLS & SERVICES', links: [
            { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
            { path: '/analysis', icon: Terminal, label: 'Log Analysis' },
            { path: '/translator', icon: Search, label: 'CLI Translator' },
            { path: '/issues', icon: AlertCircle, label: 'Incidents' },
            { path: '/kb', icon: BookOpen, label: 'Knowledge Base' },
            { path: '/reports', icon: BarChart3, label: 'Reports' },
        ]
    },
];

export default function Layout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-brand-bg flex text-brand-text">
            {/* Sidebar Mobile Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-brand-surface border-r border-brand-border transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
                <div className="flex flex-col h-full px-6 py-10">
                    {/* Integrated RASA Logo Lockup */}
                    <div className="mb-12">
                        <RasaLogoLockup />
                    </div>

                    <nav className="flex-1 space-y-8 overflow-y-auto">
                        {sidebarLinks.map((section) => (
                            <div key={section.section}>
                                <h3 className="text-[10px] font-bold text-brand-muted tracking-[0.15em] mb-4 uppercase">
                                    {section.section}
                                </h3>
                                <div className="space-y-1">
                                    {section.links.map((link) => (
                                        <NavLink
                                            key={link.path}
                                            to={link.path}
                                            onClick={() => setIsSidebarOpen(false)}
                                            className={({ isActive }) => `
                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                        ${isActive
                                                    ? 'bg-brand-orange/10 text-brand-orange font-bold shadow-sm shadow-brand-orange/5'
                                                    : 'text-brand-muted hover:bg-slate-50 hover:text-slate-900'}
                      `}
                                        >
                                            <link.icon className={`w-5 h-5 transition-colors ${location.pathname === link.path ? 'text-brand-orange' : 'text-brand-muted group-hover:text-slate-900'}`} />
                                            <span className="text-sm tracking-tight">{link.label}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* Footer Navigation */}
                    <div className="pt-6 border-t border-brand-border space-y-1">
                        <NavLink
                            to="/settings"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-brand-muted hover:bg-slate-50 hover:text-slate-900 transition-all duration-200"
                        >
                            <Settings className="w-5 h-5" />
                            <span className="text-sm font-medium tracking-tight">Settings</span>
                        </NavLink>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-brand-muted hover:bg-brand-red/5 hover:text-brand-red transition-all duration-200"
                        >
                            <LogOut className="w-5 h-5" />
                            <span className="text-sm font-medium tracking-tight">Sign Out</span>
                        </button>
                    </div>

                    {/* User Profile Footer */}
                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-brand-border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold shadow-inner">
                                {user?.username?.[0] || 'U'}
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-bold text-slate-900 truncate">{user?.username || 'User'}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <div className="w-2 h-2 bg-brand-green rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                    <span className="text-[10px] font-medium text-brand-green uppercase tracking-wide">System Online</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-20 bg-brand-surface border-b border-brand-border flex items-center justify-between px-6 shrink-0 lg:px-10">
                    <div className="flex items-center gap-4">
                        <button onClick={toggleSidebar} className="p-2 lg:hidden text-brand-muted hover:text-brand-orange transition-colors">
                            <Menu className="w-6 h-6" />
                        </button>
                        <div className="hidden sm:block">
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Rasa Service Hub</h1>
                            <p className="text-xs text-brand-muted">Welcome back, {user?.username || 'Admin'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-6">
                        <div className="relative hidden md:block">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                            <input
                                type="text"
                                placeholder="Search logs, devices..."
                                className="pl-10 pr-4 py-2 bg-slate-50 border border-brand-border rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange w-64 transition-all"
                            />
                        </div>
                        <button className="p-2 text-brand-muted hover:text-brand-orange transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <div className="absolute top-2 right-2 w-2 h-2 bg-brand-red rounded-full border-2 border-brand-surface" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-6 lg:p-10 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
