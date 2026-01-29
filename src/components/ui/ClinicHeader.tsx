'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Building2 } from 'lucide-react';

interface ClinicHeaderProps {
    pageTitle: string;
    subtitle?: string;
}

export function ClinicHeader({ pageTitle, subtitle }: ClinicHeaderProps) {
    const settings = useLiveQuery(() => db.settings.get(1));

    return (
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white mb-6 -mx-6 -mt-6 px-6 py-6">
            <div className="max-w-7xl">
                <div className="flex items-center gap-2 text-sm opacity-80 mb-1">
                    <Building2 className="w-4 h-4" />
                    {settings?.clinicName || 'Vaccine Clinic'}
                </div>
                <h1 className="text-2xl font-bold">{pageTitle}</h1>
                {subtitle && <p className="text-sm opacity-90 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
}
