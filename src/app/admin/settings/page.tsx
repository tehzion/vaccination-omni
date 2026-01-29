'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { db, Settings } from '@/lib/db';
import { generateUUID, generateQueueNumber } from '@/lib/utils';
import { Database, Download, Save, Eye, EyeOff } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/contexts/ToastContext';

export default function SettingsPage() {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const { register, handleSubmit, setValue } = useForm<Settings>();
    const [showPasscode, setShowPasscode] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    useEffect(() => {
        db.settings.get(1).then(settings => {
            if (settings) {
                setValue('clinicName', settings.clinicName);
                setValue('doctorName', settings.doctorName);
                setValue('passcode', settings.passcode);
                setValue('openaiApiKey', settings.openaiApiKey);
                setValue('n8nWebhookUrl', settings.n8nWebhookUrl);
            }
        });
    }, [setValue]);

    const onSaveSettings = async (data: Settings) => {
        try {
            await db.settings.put({ ...data, id: 1 });
            addToast('Settings saved successfully', 'success');
        } catch (e) {
            addToast('Failed to save settings', 'error');
        }
    };

    const handleClearData = async () => {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone.')) {
            await db.delete();
            await db.open();
            // Restore default settings
            await db.settings.put({ id: 1, doctorName: 'Dr. Admin', clinicName: 'My Clinic', passcode: '1234' });
            alert('Database cleared.');
            window.location.reload();
        }
    };

    const handleSeedData = async () => {
        if (confirm('Add dummy data?')) {
            const names = ['Ali', 'Mutu', 'Ah Hock', 'Jessica', 'David'];
            for (const name of names) {
                const count = await db.checkins.count();
                await db.checkins.add({
                    id: generateUUID(),
                    fullName: name,
                    mykad: '900101-14-1234',
                    queueNumber: generateQueueNumber(count + 1),
                    status: 'waiting',
                    language: 'en',
                    dose: 1,
                    timestamp: Date.now() - Math.floor(Math.random() * 10000000)
                });
            }
            addToast('Added 5 dummy patients.', 'success');
        }
    };

    const handleExport = async () => {
        const all = await db.checkins.toArray();
        const csvContent = "data:text/csv;charset=utf-8,"
            + "ID,Name,MyKad,Status,Vaccine,Batch,Date\n"
            + all.map(e => `${e.id},${e.fullName},${e.mykad},${e.status},${e.vaccineName || ''},${e.batch || ''},${new Date(e.timestamp).toISOString()}`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "vaccine_data.csv");
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <h1 className="text-2xl font-bold text-slate-900">{t.settings}</h1>

            {/* General Settings */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="font-bold text-lg mb-4">Clinic Configuration</h2>
                <form onSubmit={handleSubmit(onSaveSettings)} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Clinic Name</label>
                        <input {...register('clinicName')} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Doctor Name</label>
                        <input {...register('doctorName')} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-slate-900 outline-none" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Admin Passcode</label>
                        <div className="relative">
                            <input
                                {...register('passcode')}
                                type={showPasscode ? "text" : "password"}
                                className="w-full p-2 border border-slate-200 rounded-lg pr-10 bg-white text-black focus:ring-2 focus:ring-slate-900 outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasscode(!showPasscode)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 outline-none"
                            >
                                {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Data Analyst Service Key (OpenAI)</label>
                        <div className="relative">
                            <input
                                {...register('openaiApiKey')}
                                type={showApiKey ? "text" : "password"}
                                className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black pr-10 focus:ring-2 focus:ring-slate-900 outline-none"
                                placeholder="sk-..."
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 outline-none"
                            >
                                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Required for **Data Analyst** and **Scribe Assist**. Your key stays in this browser and is never saved on our servers.</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">n8n Webhook URL (Optional)</label>
                        <input {...register('n8nWebhookUrl')} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-slate-900 outline-none" placeholder="https://your-n8n-instance.com/webhook/..." />
                        <p className="text-xs text-slate-400 mt-1">POSTs appointment data (JSON) to this URL when you click "Sync".</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Bank Name (for Invoices)</label>
                            <input {...register('bankName')} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-slate-900 outline-none" placeholder="e.g. Maybank" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Bank Account No.</label>
                            <input {...register('bankAccount')} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-slate-900 outline-none" placeholder="e.g. 514011223344" />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button type="submit" className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-black transition flex items-center gap-2">
                            <Save className="w-4 h-4" /> Save Configuration
                        </button>
                    </div>
                </form>
            </div>

            {/* Data Management */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h2 className="font-bold text-lg mb-4">Data Management</h2>

                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                            <h3 className="font-bold text-slate-700">Export Data</h3>
                            <p className="text-sm text-slate-500">Download all records as CSV</p>
                        </div>
                        <button onClick={handleExport} className="px-4 py-2 bg-slate-900 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-black transition">
                            <Download className="w-4 h-4" /> Export CSV
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                        <div>
                            <h3 className="font-bold text-yellow-800">Seed Dummy Data</h3>
                            <p className="text-sm text-yellow-600">Add 5 dummy patients for testing</p>
                        </div>
                        <button onClick={handleSeedData} className="px-4 py-2 bg-slate-100 text-slate-900 border border-slate-200 font-bold rounded-lg hover:bg-slate-200 transition">
                            <Database className="w-4 h-4" /> Seed Data
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-100">
                        <div>
                            <h3 className="font-bold text-red-700">Reset Database</h3>
                            <p className="text-sm text-red-600">Delete all local data permanently</p>
                        </div>
                        <button onClick={handleClearData} className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition">
                            Delete All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
