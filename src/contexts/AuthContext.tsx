'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { db } from '@/lib/db';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (passcode: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const session = sessionStorage.getItem('adminSession');
        if (session === 'valid') {
            setIsAuthenticated(true);
        }
    }, []);

    // Simple route guard effect
    useEffect(() => {
        if (pathname?.startsWith('/admin') && pathname !== '/admin/login' && !isAuthenticated) {
            // Small delay to allow initial auth check
            const timer = setTimeout(() => {
                const session = sessionStorage.getItem('adminSession');
                if (session !== 'valid') {
                    router.replace('/admin/login');
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [pathname, isAuthenticated, router]);

    const login = async (passcode: string) => {
        try {
            // Fetch settings
            let settings = await db.settings.get(1);

            // Fallback for first run race condition if on('populate') hasn't fired yet
            if (!settings) {
                settings = { id: 1, doctorName: 'Dr. Admin', clinicName: 'OmniVax', passcode: '1234' };
                await db.settings.put(settings);
            }

            if (passcode === settings.passcode) {
                sessionStorage.setItem('adminSession', 'valid');
                setIsAuthenticated(true);
                return true;
            }
        } catch (e) {
            console.error('Login error', e);
        }
        return false;
    };

    const logout = () => {
        sessionStorage.removeItem('adminSession');
        setIsAuthenticated(false);
        router.replace('/admin/login');
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
