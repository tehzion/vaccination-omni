'use client';

import React, { useEffect, useState, use } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, CheckIn } from '@/lib/db';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { generateCertificatePDF } from '@/lib/pdfGenerator';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, CheckCircle, FileText, Activity, Syringe, AlertCircle, Mail, Wand2, Briefcase } from 'lucide-react';
import { generateUUID } from '@/lib/utils';
import Link from 'next/link';
import { ConfirmationModal, InputModal } from '@/components/ui/Modals';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function PatientDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const { t } = useLanguage();
    const { addToast } = useToast();
    const router = useRouter();
    const [isGenerating, setIsGenerating] = useState(false);
    const [isEmailing, setIsEmailing] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isRiskLoading, setIsRiskLoading] = useState(false);
    const [riskResult, setRiskResult] = useState<{ level: string, rationale: string, action: string } | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle');

    // Modal States
    const [showCompleteModal, setShowCompleteModal] = useState(false);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);

    // Fetch Patient
    const patient = useLiveQuery(async () => {
        if (!id) return undefined;
        return await db.checkins.get(id);
    }, [id]);

    // Fetch Templates
    const templates = useLiveQuery(async () => {
        return await db.templates.toArray();
    });

    const projects = useLiveQuery(async () => {
        return await db.projects.where('status').equals('active').toArray();
    });

    const inventory = useLiveQuery(async () => {
        return await db.inventory.toArray();
    });

    const { register, handleSubmit, reset, getValues, setValue } = useForm<Partial<CheckIn>>();

    useEffect(() => {
        if (patient) {
            reset({
                vaccineName: patient.vaccineName,
                batch: patient.batch,
                expiry: patient.expiry,
                site: patient.site,
                route: patient.route,
                administeredAt: patient.administeredAt || new Date().toISOString().slice(0, 16),
                vaccinator: patient.vaccinator,
                bpSystolic: patient.bpSystolic,
                bpDiastolic: patient.bpDiastolic,
                pulse: patient.pulse,
                notes: patient.notes,
                email: patient.email,
                projectId: patient.projectId,
                dose: patient.dose || 1,
                nextAppointment: patient.nextAppointment
            });

            if (patient.projectId) {
                // Check if we need to load defaults from project
                db.projects.get(patient.projectId).then(proj => {
                    if (proj) {
                        // Only set if patient field is empty AND project default exists
                        const updates: any = {};
                        if (!patient.vaccineName && proj.defaultVaccineName) {
                            updates.vaccineName = proj.defaultVaccineName;
                            setValue('vaccineName', proj.defaultVaccineName);
                        }
                        if (!patient.batch && proj.defaultBatch) {
                            updates.batch = proj.defaultBatch;
                            setValue('batch', proj.defaultBatch);
                        }
                        if (!patient.expiry && proj.defaultExpiry) {
                            updates.expiry = proj.defaultExpiry;
                            setValue('expiry', proj.defaultExpiry);
                        }
                    }
                });
            }

            if (patient.status === 'waiting') {
                db.checkins.update(patient.id, { status: 'in_progress' });
            }
        }
    }, [patient, reset]);

    const handleSave = async (data: Partial<CheckIn>) => {
        if (!patient) return;
        try {
            await db.checkins.update(patient.id, data);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
            addToast('Changes saved', 'success');
        } catch (e) {
            setSaveStatus('error');
            addToast('Failed to save', 'error');
        }
    };

    const handleSaveTemplate = async (name: string) => {
        const data = getValues();
        try {
            await db.templates.add({
                name,
                vaccineName: data.vaccineName || '',
                batch: data.batch || '',
                expiry: data.expiry || '',
                site: data.site || 'Left Deltoid',
                route: data.route || 'IM'
            });
            addToast('Template saved', 'success');
        } catch (e) {
            addToast('Error saving template', 'error');
        }
    };

    const handleLoadTemplate = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const templateId = Number(e.target.value);
        if (!templateId || !templates) return;

        const tmpl = templates.find(t => t.id === templateId);
        if (tmpl) {
            setValue('vaccineName', tmpl.vaccineName);
            // If template batch matches an inventory item, use it. Otherwise just set the text.
            setValue('batch', tmpl.batch);
            setValue('expiry', tmpl.expiry);
            setValue('site', tmpl.site);
            setValue('route', tmpl.route);
            addToast('Template loaded', 'success');
        }
    };

    const handleBatchSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const batchNo = e.target.value;
        setValue('batch', batchNo);

        if (batchNo && batchNo !== 'MANUAL') {
            const item = inventory?.find(i => i.batchNumber === batchNo);
            if (item) {
                setValue('vaccineName', item.vaccineName);
                setValue('expiry', item.expiryDate);

                // Auto-calculate next appointment if interval is set
                if (item.doseIntervalDays && item.doseIntervalDays > 0) {
                    const today = new Date();
                    const nextDate = new Date(today);
                    nextDate.setDate(today.getDate() + item.doseIntervalDays);
                    const nextDateStr = nextDate.toISOString().split('T')[0];
                    setValue('nextAppointment', nextDateStr);
                    addToast(`Next appointment set for ${nextDate.toLocaleDateString()} (${item.doseIntervalDays} days interval)`, 'success');
                }
            }
        }
    };
    const getSettings = async () => {
        const settings = await db.settings.get(1);
        return settings || { doctorName: 'Dr. Admin', clinicName: 'OmniVax' };
    };

    const generateCertData = async () => {
        const data = getValues();
        if (!patient) return null;
        if (!data.vaccineName || !data.batch || !data.administeredAt) {
            addToast('Missing Vaccine Name, Batch, or Date.', 'error');
            return null;
        }

        const settings = await getSettings();
        const certId = patient.certificateId || generateUUID();
        const verificationUrl = `${window.location.origin}/cert/verify/${certId}`;

        return {
            id: certId,
            patientName: patient.fullName,
            patientId: patient.mykad,
            vaccineName: data.vaccineName!,
            batch: data.batch!,
            dose: data.dose?.toString() || '1',
            date: data.administeredAt!,
            doctorName: settings.doctorName,
            clinicName: settings.clinicName,
            verificationUrl,
            certId
        };
    };

    const handleGenerateCert = async () => {
        const certData = await generateCertData();
        if (!certData) return;

        setIsGenerating(true);
        try {
            const { certId, ...pdfData } = certData;
            const pdfBytes = await generateCertificatePDF(pdfData);

            await fetch('/api/certificates', {
                method: 'POST',
                body: JSON.stringify(pdfData),
                headers: { 'Content-Type': 'application/json' }
            });

            await db.checkins.update(patient!.id, {
                certificateId: certId,
                ...getValues()
            });

            const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Certificate-${patient!.fullName}.pdf`;
            link.click();

            addToast('Certificate generated!', 'success');
        } catch (e) {
            console.error(e);
            addToast('Generation failed', 'error');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleEmailCert = async (email: string) => {
        setIsEmailing(true);
        try {
            const certData = await generateCertData();
            if (!certData) return;
            const { certId, ...pdfData } = certData;
            const pdfBytes = await generateCertificatePDF(pdfData);
            const pdfBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });

            const formData = new FormData();
            formData.append('to', email);
            formData.append('subject', 'Your Vaccination Certificate');
            formData.append('text', `Dear ${patient!.fullName},\n\nPlease find your vaccination certificate attached.\n\nThank you.`);
            formData.append('attachment', pdfBlob);

            const res = await fetch('/api/email', {
                method: 'POST',
                body: formData
            });
            const json = await res.json();
            if (json.success) addToast('Email sent successfully', 'success');
            else throw new Error(json.error);

        } catch (e) {
            addToast('Error sending email', 'error');
        } finally {
            setIsEmailing(false);
        }
    };

    const requestEmail = () => {
        if (!patient?.certificateId) {
            addToast('Generate a certificate first', 'info');
            return;
        }
        setShowEmailModal(true);
    };

    const handleAiAssist = async () => {
        const currentNotes = getValues('notes');
        if (!currentNotes) {
            addToast('Type some notes first', 'info');
            return;
        }

        setIsAiLoading(true);
        try {
            const settings = await db.settings.get(1);
            const apiKey = settings?.openaiApiKey || '';

            const res = await fetch('/api/ai', {
                method: 'POST',
                body: JSON.stringify({ prompt: currentNotes, type: 'notes' }),
                headers: {
                    'Content-Type': 'application/json',
                    'x-openai-key': apiKey
                }
            });
            const json = await res.json();
            if (json.result) {
                setValue('notes', json.result);
                addToast('Notes summarized by AI', 'success');
            }
        } catch (e) {
            addToast('AI Service offline', 'error');
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleMeasureRisk = async () => {
        const data = getValues();
        const vitals = `BP: ${data.bpSystolic}/${data.bpDiastolic}, Pulse: ${data.pulse}`;
        const notes = data.notes || '(No clinical notes)';

        setIsRiskLoading(true);
        setRiskResult(null);

        try {
            const settings = await db.settings.get(1);
            const apiKey = settings?.openaiApiKey || '';

            const res = await fetch('/api/ai', {
                method: 'POST',
                body: JSON.stringify({
                    prompt: `Vitals: ${vitals}\nNotes: ${notes}`,
                    type: 'risk'
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'x-openai-key': apiKey
                }
            });
            const json = await res.json();
            if (json.result) {
                // Parse AI response (basic parsing based on expected format)
                const levelMatch = json.result.match(/\[RISK LEVEL\]:\s*(.*)/i);
                const rationaleMatch = json.result.match(/\[RATIONALE\]:\s*(.*)/i);
                const actionMatch = json.result.match(/\[ACTION\]:\s*(.*)/i);

                setRiskResult({
                    level: levelMatch ? levelMatch[1].trim() : 'UNKNOWN',
                    rationale: rationaleMatch ? rationaleMatch[1].trim() : 'Could not parse rationale.',
                    action: actionMatch ? actionMatch[1].trim() : 'Consult Physician.'
                });
                addToast('Risk assessment complete', 'success');
            } else if (json.error) {
                addToast(json.error, 'error');
            }
        } catch (e) {
            addToast('Risk analysis failed', 'error');
        } finally {
            setIsRiskLoading(false);
        }
    };

    const handleComplete = async () => {
        if (!patient) return;
        const data = getValues();

        // 1. Auto-Generate & Email Cert if Vaccine Info is present
        if (data.vaccineName && data.batch && data.email && !patient.certificateId) {
            addToast('Auto-generating Certificate...', 'info');
            try {
                // Generate
                const certData = await generateCertData();
                if (certData) {
                    const { certId, ...pdfData } = certData;
                    const pdfBytes = await generateCertificatePDF(pdfData);

                    // Save Cert ID locally
                    await db.checkins.update(patient.id, {
                        certificateId: certId,
                        ...data
                    });

                    // Send Email
                    addToast('Sending Email...', 'info');
                    const pdfBlob = new Blob([pdfBytes as any], { type: 'application/pdf' });
                    const formData = new FormData();
                    formData.append('to', data.email);
                    formData.append('subject', 'Your Vaccination Certificate');
                    formData.append('text', `Dear ${patient.fullName},\n\nThank you for completing your vaccination. Please find your digital certificate attached.\n\nStay Safe, \nVaccineManager System`);
                    formData.append('attachment', pdfBlob);

                    const res = await fetch('/api/email', { method: 'POST', body: formData });
                    if (!res.ok) throw new Error(`Server returned ${res.status}`);

                    const json = await res.json();
                    if (json.success) addToast('Certificate Emailed!', 'success');
                    else addToast('Email failed: ' + json.error, 'error');
                }
            } catch (e) {
                console.error('Auto-Cert Error', e);
                addToast('Auto-Cert failed, but saving patient.', 'error');
            }
        } else if (!data.email) {
            addToast('No email provided. Skipping auto-email.', 'info');
        }

        // 2. Deduct Inventory (Only if completing for the first time or batch changed)
        if (data.batch && data.batch !== 'MANUAL') {
            const isCompleted = patient.status === 'completed';
            const batchChanged = data.batch !== patient.batch;

            if (!isCompleted || batchChanged) {
                // If we changed batch, credit back the old one (if it exists)
                if (batchChanged && patient.batch && patient.batch !== 'MANUAL') {
                    const oldStock = inventory?.find(i => i.batchNumber === patient.batch);
                    if (oldStock) {
                        await db.inventory.update(oldStock.id!, { count: oldStock.count + 1 });
                    }
                }

                // Deduct the new one
                const newStock = inventory?.find(i => i.batchNumber === data.batch);
                if (newStock) {
                    if (newStock.count <= 0) addToast('Warning: Stock count is 0, but proceeding.', 'error');
                    await db.inventory.update(newStock.id!, { count: newStock.count - 1 });
                }
            }
        }

        // 3. Mark Complete
        await handleSave(getValues());
        await db.checkins.update(patient.id, { status: 'completed' });
        router.push('/admin/queue');
        addToast('Patient marked completed', 'success');
    };

    if (!patient) return <div className="p-8">Loading...</div>;

    const hasCert = !!patient.certificateId;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">

            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/queue" className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ArrowLeft className="w-6 h-6 text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{patient.fullName}</h1>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <span>{patient.mykad}</span>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-xs">{patient.status}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Project Assignment */}
                <div className="col-span-1 lg:col-span-2 bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Briefcase className="w-5 h-5 text-slate-500" />
                        <h2 className="font-bold text-slate-800">Assign Project</h2>
                    </div>
                    <select {...register('projectId', { valueAsNumber: true })} className="w-full sm:flex-1 p-2 border rounded-lg bg-slate-50 text-black">
                        <option value="">-- No Project (Walk-in) --</option>
                        {projects?.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
                        ))}
                    </select>
                </div>

                {/* Vitals Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-red-500" />
                            <h2 className="font-bold text-slate-800">Vital Signs</h2>
                        </div>
                        <button
                            type="button"
                            onClick={handleMeasureRisk}
                            disabled={isRiskLoading}
                            className="text-xs font-bold px-3 py-1 bg-slate-900 text-white rounded-lg hover:bg-black transition disabled:opacity-50 flex items-center gap-1"
                        >
                            {isRiskLoading ? 'Measuring...' : 'Measure Risk'}
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Email (for Certificate)</label>
                            <input {...register('email')} type="email" className="w-full p-2 border rounded-lg text-black font-medium placeholder:text-slate-400 bg-white" placeholder="patient@example.com" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">BP Systolic</label>
                            <input {...register('bpSystolic')} type="number" className="w-full p-2 border rounded-lg text-black font-medium placeholder:text-slate-400 bg-white" placeholder="120" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">BP Diastolic</label>
                            <input {...register('bpDiastolic')} type="number" className="w-full p-2 border rounded-lg text-black font-medium placeholder:text-slate-400 bg-white" placeholder="80" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Pulse (bpm)</label>
                            <input {...register('pulse')} type="number" className="w-full p-2 border rounded-lg text-black font-medium placeholder:text-slate-400 bg-white" placeholder="72" />
                        </div>
                    </div>

                    {/* Risk Result Display */}
                    {riskResult && (
                        <div className={`mt-4 p-4 rounded-xl border animate-in slide-in-from-top-2 duration-300 ${riskResult.level.toUpperCase().includes('HIGH') ? 'bg-red-50 border-red-100' :
                            riskResult.level.toUpperCase().includes('MEDIUM') ? 'bg-orange-50 border-orange-100' :
                                'bg-green-50 border-green-100'
                            }`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">AI Risk Assessment</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${riskResult.level.toUpperCase().includes('HIGH') ? 'bg-red-500 text-white' :
                                    riskResult.level.toUpperCase().includes('MEDIUM') ? 'bg-orange-500 text-white' :
                                        'bg-green-500 text-white'
                                    }`}>
                                    {riskResult.level}
                                </span>
                            </div>
                            <p className="text-sm text-slate-800 font-bold mb-1">{riskResult.rationale}</p>
                            <div className="flex items-center gap-1 text-[10px] font-black text-slate-500 uppercase italic">
                                Recommended: {riskResult.action}
                            </div>
                        </div>
                    )}
                </div>

                {/* Private Notes */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 relative">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                        <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-yellow-500" />
                            <h2 className="font-bold text-slate-800">Doctor Notes (Private)</h2>
                        </div>
                        <button
                            type="button"
                            onClick={handleAiAssist}
                            disabled={isAiLoading}
                            className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold bg-slate-100 px-2 py-1 rounded-md transition"
                        >
                            <Wand2 className="w-3 h-3" /> {isAiLoading ? 'Wait...' : 'Assist Scribe'}
                        </button>
                    </div>
                    <textarea
                        {...register('notes')}
                        className="w-full h-32 p-3 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none resize-none px-4 text-black font-medium placeholder:text-slate-400 bg-white"
                        placeholder="Clinical notes..."
                    />
                </div>

                {/* Vaccination Section */}
                <div className="col-span-1 lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                        <div className="flex items-center gap-2">
                            <Syringe className="w-5 h-5 text-blue-600" />
                            <h2 className="font-bold text-slate-800">Vaccination Details</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <select onChange={handleLoadTemplate} className="text-xs p-1 border rounded bg-slate-50 text-slate-600">
                                <option value="">Load Template...</option>
                                {templates?.map(t => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <button type="button" onClick={() => setShowTemplateModal(true)} className="text-xs font-bold text-slate-900 hover:text-black bg-slate-100 px-2 py-1 rounded">
                                Save as Template
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Vaccine Name / Brand</label>
                                <input {...register('vaccineName')} className="w-full p-2 border rounded-lg text-black font-medium placeholder:text-slate-400 bg-white" placeholder="e.g. Comirnaty" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Batch / Stock</label>
                                <select
                                    {...register('batch')}
                                    onChange={(e) => {
                                        handleBatchSelect(e);
                                    }}
                                    className="w-full p-2 border rounded-lg bg-white text-black"
                                >
                                    <option value="">-- Select Stock --</option>
                                    {inventory?.filter(i => i.count > 0).map(item => (
                                        <option key={item.id} value={item.batchNumber}>
                                            {item.vaccineName} ({item.batchNumber}) - {item.count} doses left
                                        </option>
                                    ))}
                                    <option disabled>──────────</option>
                                    <option value="MANUAL">Manual Entry...</option>
                                </select>

                                {getValues('batch') === 'MANUAL' && (
                                    <input
                                        className="w-full p-2 border rounded-lg mt-2 text-sm animate-in fade-in slide-in-from-top-1 duration-200 text-black font-medium placeholder:text-slate-400 bg-white"
                                        placeholder="Type Manual Batch No."
                                        autoFocus
                                        onChange={(e) => setValue('batch', e.target.value)}
                                    />
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                                <input {...register('expiry')} type="date" className="w-full p-2 border rounded-lg text-black bg-white" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Administration Site</label>
                                <select {...register('site')} className="w-full p-2 border rounded-lg text-black bg-white">
                                    <option value="Left Deltoid">Left Deltoid</option>
                                    <option value="Right Deltoid">Right Deltoid</option>
                                    <option value="Left Thigh">Left Thigh</option>
                                    <option value="Right Thigh">Right Thigh</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Route</label>
                                <select {...register('route')} className="w-full p-2 border rounded-lg text-black bg-white">
                                    <option value="IM">Intramuscular (IM)</option>
                                    <option value="SC">Subcutaneous (SC)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Date & Time</label>
                                <input {...register('administeredAt')} type="datetime-local" className="w-full p-2 border rounded-lg text-black font-medium bg-white" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dose Number</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 border p-2 rounded-lg flex-1 cursor-pointer bg-white has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                                    <input {...register('dose', { valueAsNumber: true })} type="radio" value="1" className="w-4 h-4 text-slate-900 focus:ring-slate-900" />
                                    <span className="font-bold text-sm text-black">Dose 1</span>
                                </label>
                                <label className="flex items-center gap-2 border p-2 rounded-lg flex-1 cursor-pointer bg-white has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50">
                                    <input {...register('dose', { valueAsNumber: true })} type="radio" value="2" className="w-4 h-4 text-slate-900 focus:ring-slate-900" />
                                    <span className="font-bold text-sm text-black">Dose 2</span>
                                </label>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="block text-sm font-medium text-slate-700">Next Appointment (for Dose 2)</label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const d = new Date();
                                        d.setDate(d.getDate() + 21);
                                        setValue('nextAppointment', d.toISOString().split('T')[0]);
                                    }}
                                    className="text-[10px] font-bold bg-slate-900 text-white px-2 py-0.5 rounded hover:bg-black transition"
                                >
                                    +21 Days
                                </button>
                            </div>
                            <input {...register('nextAppointment')} type="date" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-black bg-white" />
                            <p className="text-xs text-slate-500 mt-1">Leave empty if no further appointment needed.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Action Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 md:pl-72 flex flex-col sm:flex-row gap-4 items-center justify-between z-10 transition-all">
                <div className="flex items-center justify-between sm:justify-start gap-4 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                        {saveStatus === 'saved' && <span className="text-green-600 text-sm flex items-center"><CheckCircle className="w-4 h-4 mr-1" /> Saved</span>}
                        <button
                            onClick={handleSubmit(handleSave)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-2 transition"
                        >
                            <Save className="w-4 h-4" /> <span className="hidden xs:inline">Save Draft</span>
                        </button>
                    </div>

                    {hasCert && (
                        <button
                            onClick={requestEmail}
                            disabled={isEmailing}
                            className="px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 font-bold rounded-lg flex items-center gap-2 transition disabled:opacity-50 sm:hidden"
                        >
                            <Mail className="w-4 h-4" /> {isEmailing ? '...' : 'Email'}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {hasCert && (
                        <button
                            onClick={requestEmail}
                            disabled={isEmailing}
                            className="hidden sm:flex px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 font-bold rounded-lg items-center gap-2 transition disabled:opacity-50"
                        >
                            <Mail className="w-4 h-4" /> {isEmailing ? 'Sending...' : 'Email Cert'}
                        </button>
                    )}

                    <button
                        onClick={handleGenerateCert}
                        disabled={isGenerating}
                        className="flex-1 sm:flex-none px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50"
                    >
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{isGenerating ? 'Wait...' : 'Create Cert'}</span>
                    </button>

                    <button
                        onClick={() => setShowCompleteModal(true)}
                        className="flex-[1.5] sm:flex-none px-6 py-2 bg-slate-900 hover:bg-black text-white font-bold rounded-lg flex items-center justify-center gap-2 transition"
                    >
                        <CheckCircle className="w-4 h-4" /> <span>Mark Complete</span>
                    </button>
                </div>
            </div>

            {/* Modals */}
            <ConfirmationModal
                isOpen={showCompleteModal}
                onClose={() => setShowCompleteModal(false)}
                onConfirm={handleComplete}
                title="Complete Patient"
                description={`Are you sure you want to mark ${patient?.fullName} as completed? This will return you to the queue.`}
                confirmText="Complete"
            />

            <InputModal
                isOpen={showTemplateModal}
                onClose={() => setShowTemplateModal(false)}
                onConfirm={handleSaveTemplate}
                title="Save Template"
                description="Enter a name for this vaccination template (e.g. Pfizer Batch 101)"
                placeholder="Template Name"
                confirmText="Save Template"
            />

            <InputModal
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                onConfirm={handleEmailCert}
                title="Email Certificate"
                description="Enter the patient's email address to send the PDF."
                placeholder="patient@example.com"
                confirmText="Send Email"
                defaultValue={getValues('notes')?.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0] || ''}
            />

        </div>
    );
}
