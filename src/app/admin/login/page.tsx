'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, Sparkles } from 'lucide-react';

export default function AdminLoginPage() {
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await login(passcode);
        if (success) {
            router.push('/admin/queue');
        } else {
            setError('Invalid passcode');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden p-4 font-inter">
            <div className="relative z-10 w-full max-w-sm">
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 space-y-8">
                    <div className="text-center space-y-2">
                        <div className="inline-flex p-4 bg-slate-900 rounded-2xl shadow-sm mb-4">
                            <ShieldCheck className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                            Admin Access
                        </h1>
                        <p className="text-slate-500 text-sm font-medium">Please verify your medical passcode</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <div className="relative group">
                                <input
                                    type="password"
                                    value={passcode}
                                    onChange={(e) => setPasscode(e.target.value)}
                                    placeholder="••••"
                                    className="w-full px-4 py-4 rounded-2xl bg-white border border-slate-200 text-black text-center text-3xl tracking-[1em] focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all outline-none"
                                    autoFocus
                                />
                            </div>
                            {error && (
                                <p className="text-red-600 text-sm font-bold mt-2 text-center flex items-center justify-center gap-1">
                                    <Lock className="w-3 h-3" /> {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="w-full py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            Unlock Dashboard
                        </button>
                    </form>

                    <div className="pt-4 border-t border-slate-100">
                        <p className="text-[10px] text-center text-slate-400 uppercase font-bold tracking-widest">
                            Clinic Safety Protocol Active
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
