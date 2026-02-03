'use client';

import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { db, Settings } from '@/lib/db';
import { generateUUID, generateQueueNumber } from '@/lib/utils';
import { Database, Download, Save, Eye, EyeOff, Mail, Image, Palette, Phone, MapPin, Globe } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useToast } from '@/contexts/ToastContext';

export default function SettingsPage() {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const { register, handleSubmit, setValue, watch } = useForm<Settings>();
    const [showPasscode, setShowPasscode] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);
    const [showSmtpPassword, setShowSmtpPassword] = useState(false);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);

    useEffect(() => {
        db.settings.get(1).then(settings => {
            if (settings) {
                setValue('clinicName', settings.clinicName);
                setValue('doctorName', settings.doctorName);
                setValue('passcode', settings.passcode);
                setValue('openaiApiKey', settings.openaiApiKey);
                setValue('n8nWebhookUrl', settings.n8nWebhookUrl);
                setValue('bankName', settings.bankName);
                setValue('bankAccount', settings.bankAccount);

                // SMTP
                setValue('smtpHost', settings.smtpHost);
                setValue('smtpPort', settings.smtpPort);
                setValue('smtpUser', settings.smtpUser);
                setValue('smtpPassword', settings.smtpPassword);
                setValue('smtpFromName', settings.smtpFromName);
                setValue('smtpFromEmail', settings.smtpFromEmail);

                // Branding
                setValue('clinicLogo', settings.clinicLogo);
                setValue('brandColor', settings.brandColor);
                if (settings.clinicLogo) setLogoPreview(settings.clinicLogo);

                // Contact
                setValue('clinicAddress', settings.clinicAddress);
                setValue('clinicPhone', settings.clinicPhone);
                setValue('clinicEmail', settings.clinicEmail);
                setValue('clinicWebsite', settings.clinicWebsite);
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

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500000) {
                addToast('Logo file too large (max 500KB)', 'error');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result as string;
                setLogoPreview(dataUrl);
                setValue('clinicLogo', dataUrl);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveLogo = () => {
        setLogoPreview(null);
        setValue('clinicLogo', undefined);
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

                    {/* SMTP Configuration */}
                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Mail className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-slate-900">SMTP Email Configuration</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">SMTP Host</label>
                                    <input {...register('smtpHost')} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm" placeholder="smtp.gmail.com" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">Port</label>
                                    <input {...register('smtpPort', { valueAsNumber: true })} type="number" className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm" placeholder="587" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">SMTP Username</label>
                                <input {...register('smtpUser')} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm" placeholder="your-email@gmail.com" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">SMTP Password</label>
                                <div className="relative">
                                    <input
                                        {...register('smtpPassword')}
                                        type={showSmtpPassword ? "text" : "password"}
                                        className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black pr-10 text-sm"
                                        placeholder="App password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                                    >
                                        {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">From Name</label>
                                    <input {...register('smtpFromName')} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm" placeholder="My Clinic" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1">From Email</label>
                                    <input {...register('smtpFromEmail')} type="email" className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm" placeholder="noreply@clinic.com" />
                                </div>
                            </div>
                            <p className="text-xs text-slate-500">Configure SMTP to send vaccination certificates via email. For Gmail, use app passwords.</p>
                        </div>
                    </div>

                    {/* Logo & Branding */}
                    <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Image className="w-5 h-5 text-purple-600" />
                            <h3 className="font-bold text-slate-900">Logo & Branding</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-2">Clinic Logo</label>
                                {logoPreview ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                                            <img src={logoPreview} alt="Logo preview" className="h-12 w-12 object-contain" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-slate-900">Logo uploaded</p>
                                                <p className="text-xs text-slate-500">Will appear on certificates and invoices</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleRemoveLogo}
                                                className="px-3 py-1 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <input
                                            type="file"
                                            accept="image/png,image/jpeg,image/svg+xml"
                                            onChange={handleLogoUpload}
                                            className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm"
                                        />
                                        <p className="text-xs text-slate-500 mt-1">PNG, JPG, or SVG (max 500KB)</p>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                    <Palette className="w-3 h-3" />
                                    Brand Color
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        {...register('brandColor')}
                                        type="color"
                                        className="h-10 w-16 border border-slate-200 rounded-lg cursor-pointer"
                                    />
                                    <input
                                        {...register('brandColor')}
                                        type="text"
                                        className="flex-1 p-2 border border-slate-200 rounded-lg bg-white text-black text-sm font-mono"
                                        placeholder="#3B82F6"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Phone className="w-5 h-5 text-green-600" />
                            <h3 className="font-bold text-slate-900">Contact Information</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    Clinic Address
                                </label>
                                <textarea {...register('clinicAddress')} rows={2} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm" placeholder="123 Medical Street, Kuala Lumpur" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        Phone Number
                                    </label>
                                    <input {...register('clinicPhone')} className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm" placeholder="+60 3-1234 5678" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        Contact Email
                                    </label>
                                    <input {...register('clinicEmail')} type="email" className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm" placeholder="info@clinic.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    Website URL
                                </label>
                                <input {...register('clinicWebsite')} type="url" className="w-full p-2 border border-slate-200 rounded-lg bg-white text-black text-sm" placeholder="https://myclinic.com" />
                            </div>
                            <p className="text-xs text-slate-500">Contact information will appear on invoices and certificates.</p>
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
