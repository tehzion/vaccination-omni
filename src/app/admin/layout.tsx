'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Briefcase, ChevronRight, History, Home, LogOut, Menu, Settings, Users, X, Package, Sparkles, Building2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, logout } = useAuth();
    const { t } = useLanguage();
    const pathname = usePathname();
    const [isMenuOpen, setIsMenuOpen] = React.useState(false);

    // Close menu when route changes
    React.useEffect(() => {
        setIsMenuOpen(false);
    }, [pathname]);

    // If not authenticated, we just render children (which might be redirecting) 
    // or a simple wrapper. The AuthContext handles the redirect logic.
    // But strictly for the login page, we don't want the sidebar.
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    if (!isAuthenticated) {
        return null; // Or a loading spinner while redirecting
    }

    const navItems = [
        { href: '/admin/queue', label: t.queue, icon: Users },
        { href: '/admin/reminders', label: 'Reminders', icon: Bell },
        { href: '/admin/projects', label: 'Vaccination Drives', icon: Briefcase }, // Added
        { href: '/admin/history', label: t.history, icon: History },
        { href: '/admin/settings', label: t.settings, icon: Settings },
    ];

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Mobile Header */}
            <header className="md:hidden bg-black text-white p-4 flex justify-between items-center sticky top-0 z-50">
                <h1 className="text-xl font-bold tracking-tight">Vaccine<span className="font-normal text-neutral-400">Mgr</span></h1>
                <button
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    className="p-2 hover:bg-neutral-800 rounded-lg transition"
                >
                    {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            {/* Mobile Overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Sidebar (Responsive) */}
            <aside className={`
                w-64 bg-black text-white flex flex-col flex-shrink-0
                fixed md:sticky top-0 h-screen z-50 transition-transform duration-300
                ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
            `}>
                <div className="p-6 hidden md:block">
                    <h1 className="text-2xl font-bold tracking-tight">Vaccine<span className="font-normal text-neutral-400">Mgr</span></h1>
                </div>

                <nav className="flex-1 px-4 space-y-1 mt-4 md:mt-0">
                    <Link href="/admin/dashboard" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${pathname === '/admin/dashboard' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>
                        <Home className="w-5 h-5" /> Dashboard
                    </Link>
                    <Link href="/admin/queue" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${pathname === '/admin/queue' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>
                        <Users className="w-5 h-5" /> {t.queue}
                    </Link>
                    <Link href="/admin/projects" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${pathname === '/admin/projects' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>
                        <Briefcase className="w-5 h-5" /> Projects
                    </Link>
                    <Link href="/admin/clients" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${pathname === '/admin/clients' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>
                        <Building2 className="w-5 h-5" /> Client Accounts
                    </Link>
                    <Link href="/admin/reminders" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${pathname === '/admin/reminders' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>
                        <Bell className="w-5 h-5" /> Reminders
                    </Link>
                    <Link href="/admin/inventory" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${pathname === '/admin/inventory' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>
                        <Package className="w-5 h-5" /> Inventory
                    </Link>
                    <Link href="/admin/analysis" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${pathname === '/admin/analysis' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>
                        <Sparkles className="w-5 h-5" /> Data Analyst
                    </Link>
                    <Link href="/admin/history" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${pathname === '/admin/history' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>
                        <History className="w-5 h-5" /> {t.history}
                    </Link>
                    <Link href="/admin/settings" className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${pathname === '/admin/settings' ? 'bg-white text-black font-bold' : 'text-neutral-400 hover:text-white hover:bg-neutral-900'}`}>
                        <Settings className="w-5 h-5" /> {t.settings}
                    </Link>
                </nav>

                <div className="p-4 border-t border-neutral-800">
                    <button onClick={() => logout()} className="flex items-center gap-3 px-4 py-3 text-neutral-400 hover:text-white w-full transition-colors">
                        <LogOut className="w-5 h-5" /> {t.logout}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
