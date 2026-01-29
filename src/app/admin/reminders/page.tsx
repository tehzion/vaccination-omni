'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Phone, Mail, Clock, ArrowRight, Globe } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/contexts/ToastContext';

export default function RemindersPage() {
    const { t } = useLanguage();
    const { addToast } = useToast();

    const appointments = useLiveQuery(async () => {
        // Get all completed patients who have a nextAppointment
        const all = await db.checkins
            .filter(c => !!c.nextAppointment)
            .toArray();

        // Sort by next appointment date
        return all.sort((a, b) => (a.nextAppointment! > b.nextAppointment!) ? 1 : -1);
    }, []);

    const dueTodayCount = appointments?.filter(a => {
        const d = new Date(a.nextAppointment!).toISOString().slice(0, 10);
        const today = new Date().toISOString().slice(0, 10);
        return d === today;
    }).length || 0;

    const upcomingCount = appointments?.filter(a => {
        const d = new Date(a.nextAppointment!);
        const today = new Date();
        const diffTime = Math.abs(d.getTime() - today.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 7;
    }).length || 0;

    if (!appointments) return <div className="p-8">Loading reminders...</div>;

    return (
        <div className="space-y-6 pb-20">
            <h1 className="text-2xl font-bold text-slate-900">Follow-up Reminders</h1>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                    <h3 className="text-xs font-bold text-orange-600 uppercase mb-1">Due Today</h3>
                    <p className="text-3xl font-bold text-orange-900">{dueTodayCount}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-600 uppercase mb-1">Upcoming (7 Days)</h3>
                    <p className="text-3xl font-bold text-blue-900">{upcomingCount}</p>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 font-bold text-slate-700 bg-slate-50">
                    Next Appointments
                </div>
                <div className="divide-y divide-slate-100">
                    {appointments.map(reminder => (
                        <div key={reminder.id} className="p-4 hover:bg-slate-50 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-start gap-4">
                                <div className="flex flex-col items-center bg-slate-100 rounded-lg p-2 min-w-[60px]">
                                    <span className="text-xs font-bold text-slate-500 uppercase">{new Date(reminder.nextAppointment!).toLocaleString('default', { month: 'short' })}</span>
                                    <span className="text-xl font-bold text-slate-900">{new Date(reminder.nextAppointment!).getDate()}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-lg">{reminder.fullName}</h3>
                                    <div className="text-sm text-slate-500 flex flex-wrap gap-3 mt-1">
                                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {reminder.phone || '-'}</span>
                                        {reminder.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {reminder.email}</span>}
                                        <span className="font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Due for Dose {Number(reminder.dose) + 1}
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1">
                                        Previous: {reminder.vaccineName} ({reminder.batch})
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <Link
                                    href={`/admin/patient/${reminder.id}`}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 text-center flex-1 sm:flex-none"
                                >
                                    View Logic
                                </Link>
                                <button
                                    onClick={() => addToast('Feature Coming: One-click check-in', 'info')}
                                    className="px-4 py-2 bg-black text-white hover:bg-neutral-800 rounded-lg font-bold text-sm flex items-center justify-center gap-2 flex-1 sm:flex-none"
                                >
                                    Check In <ArrowRight className="w-4 h-4 ml-1" />
                                </button>
                                <button
                                    onClick={async () => {
                                        const settings = await db.settings.get(1);
                                        if (!settings?.n8nWebhookUrl) {
                                            alert('Please configure n8n Webhook URL in Settings first.');
                                            return;
                                        }
                                        try {
                                            const res = await fetch(settings.n8nWebhookUrl, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(reminder)
                                            });
                                            if (res.ok) alert('Sent to n8n!');
                                            else alert('Failed to send.');
                                        } catch (e) {
                                            alert('Network Error');
                                        }
                                    }}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-50 flex items-center justify-center"
                                    title="Sync to n8n"
                                >
                                    <Globe className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {appointments.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            No upcoming appointments scheduled.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
