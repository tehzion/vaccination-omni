'use client';

import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Building2, LogIn } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';

export default function ClientLoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, isAuthenticated } = useClientAuth();
    const router = useRouter();
    const settings = useLiveQuery(() => db.settings.get(1));

    React.useEffect(() => {
        if (isAuthenticated) {
            router.push('/client/dashboard');
        }
    }, [isAuthenticated, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const success = await login(email.trim(), password);

        if (success) {
            router.push('/client/dashboard');
        } else {
            setError('Invalid email or password');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-black rounded-full mb-4">
                        <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Business Owner Portal</h1>
                    <p className="text-slate-600 text-sm">Access your vaccination project dashboard</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            <Mail className="w-4 h-4 inline mr-1" />
                            Email Address
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-black outline-none"
                            placeholder="your@company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            <Lock className="w-4 h-4 inline mr-1" />
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-black outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading || !email || !password}
                        className="w-full py-3 bg-black text-white rounded-lg font-bold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Logging in...
                            </>
                        ) : (
                            <>
                                <LogIn className="w-4 h-4" />
                                Login to Dashboard
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-slate-500">
                    <p>Need access? Contact your administrator</p>
                    {settings?.clinicName && (
                        <p className="mt-2 text-slate-400">Powered by {settings.clinicName}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
