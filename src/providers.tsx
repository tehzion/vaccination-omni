'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ClientAuthProvider } from '@/contexts/ClientAuthContext';
import { useEffect } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('SW Registered', reg.scope))
                .catch(err => console.error('SW Failed', err));
        }
    }, []);

    return (
        <LanguageProvider>
            <ToastProvider>
                <AuthProvider>
                    <ClientAuthProvider>
                        {children}
                    </ClientAuthProvider>
                </AuthProvider>
            </ToastProvider>
        </LanguageProvider>
    );
}
