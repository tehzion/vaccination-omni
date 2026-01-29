'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, ClientAccount } from '@/lib/db';
import { useRouter } from 'next/navigation';

interface ClientAuthContextType {
    client: ClientAccount | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined);

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
    const [client, setClient] = useState<ClientAccount | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Check for existing session
        const checkSession = async () => {
            const sessionData = localStorage.getItem('client_session');
            if (sessionData) {
                try {
                    const { clientId } = JSON.parse(sessionData);
                    const clientAccount = await db.clientAccounts.get(clientId);
                    if (clientAccount) {
                        setClient(clientAccount);
                    } else {
                        localStorage.removeItem('client_session');
                    }
                } catch (error) {
                    localStorage.removeItem('client_session');
                }
            }
            setIsLoading(false);
        };
        checkSession();
    }, []);

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            // Simple password hash (for MVP - in production use bcrypt/argon2)
            const hashedPassword = btoa(password); // Base64 encoding for MVP

            const clientAccount = await db.clientAccounts
                .where('email')
                .equals(email.toLowerCase())
                .first();

            if (clientAccount && clientAccount.password === hashedPassword) {
                // Update last login
                await db.clientAccounts.update(clientAccount.id!, { lastLogin: Date.now() });

                setClient(clientAccount);
                localStorage.setItem('client_session', JSON.stringify({ clientId: clientAccount.id }));
                return true;
            }
            return false;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    };

    const logout = () => {
        setClient(null);
        localStorage.removeItem('client_session');
        router.push('/client');
    };

    return (
        <ClientAuthContext.Provider value={{ client, isAuthenticated: !!client, login, logout, isLoading }}>
            {children}
        </ClientAuthContext.Provider>
    );
}

export function useClientAuth() {
    const context = useContext(ClientAuthContext);
    if (context === undefined) {
        throw new Error('useClientAuth must be used within a ClientAuthProvider');
    }
    return context;
}

// Password utility for creating accounts (admin use)
export function hashPassword(password: string): string {
    return btoa(password);
}
