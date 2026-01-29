'use client';

import React, { use, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, Briefcase, MapPin, User, Printer, QrCode, Users, Receipt, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';
import { generateInvoicePDF } from '@/lib/pdfGenerator';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ProjectDetailPage({ params }: PageProps) {
    const { id } = use(params);
    const projectId = Number(id);
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
    const router = useRouter();

    const handleDeleteProject = async () => {
        if (confirm('Are you sure you want to delete this project? Patients will stay in your history but will no longer be linked to this project.')) {
            await db.projects.delete(projectId);
            router.push('/admin/projects');
        }
    };

    // Invoice State
    const [invoiceForm, setInvoiceForm] = useState({
        clientName: '',
        clientAddress: '',
        invoiceNumber: '',
        date: '',
        items: [] as { description: string; quantity: number; unitPrice: number }[]
    });

    const project = useLiveQuery(async () => {
        if (!projectId) return undefined;
        return await db.projects.get(projectId);
    }, [projectId]);

    const patients = useLiveQuery(async () => {
        if (!projectId) return [];
        return await db.checkins.where('projectId').equals(projectId).reverse().sortBy('timestamp');
    }, [projectId]);

    const settings = useLiveQuery(() => db.settings.get(1));

    useEffect(() => {
        if (project) {
            const url = `${window.location.protocol}//${window.location.host}/checkin?projectId=${projectId}`;
            QRCode.toDataURL(url, { width: 300, margin: 2, scale: 10 }, (err, url) => {
                if (!err) setQrDataUrl(url);
            });
        }
    }, [project, projectId]);

    const printQr = () => {
        const win = window.open('', '', 'width=600,height=600');
        if (win) {
            win.document.write(`
                <html>
                    <head><title>Project QR</title></head>
                    <body style="text-align: center; font-family: sans-serif; padding: 50px;">
                        <h1>${project?.name}</h1>
                        <p>Scan to Check In</p>
                        <img src="${qrDataUrl}" style="width: 400px; height: 400px;" />
                        <br/><br/>
                        <button onclick="window.print()">Print</button>
                    </body>
                </html>
            `);
        }
    };

    const openInvoiceModal = () => {
        if (!project) return;
        const completedCount = patients?.filter(p => p.status === 'completed').length || 0;

        setInvoiceForm({
            clientName: project.clientName,
            clientAddress: project.invoiceAddress || '',
            invoiceNumber: `INV-${projectId}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
            date: new Date().toLocaleDateString(),
            items: [
                {
                    description: `Vaccination Service - ${project.name}`,
                    quantity: completedCount,
                    unitPrice: 50
                }
            ]
        });
        setIsInvoiceModalOpen(true);
    };

    const handleGenerateInvoice = async () => {
        if (!project) return;

        const itemsWithTotal = invoiceForm.items.map(item => ({
            ...item,
            total: item.quantity * item.unitPrice
        }));
        const total = itemsWithTotal.reduce((sum, item) => sum + item.total, 0);

        const pdfBytes = await generateInvoicePDF({
            invoiceNumber: invoiceForm.invoiceNumber,
            date: invoiceForm.date,
            myClinicName: settings?.clinicName || 'My Clinic',
            myClinicAddress: settings?.doctorName ? `Dr. ${settings.doctorName}` : 'Main Branch',
            bankName: settings?.bankName || 'Maybank',
            bankAccount: settings?.bankAccount || '5140-1122-3344',
            clientName: invoiceForm.clientName,
            clientAddress: invoiceForm.clientAddress,
            items: itemsWithTotal,
            grandTotal: total
        });

        // Save to Database
        try {
            await db.invoices.add({
                projectId: project.id!,
                invoiceNumber: invoiceForm.invoiceNumber,
                clientName: invoiceForm.clientName,
                amount: total,
                date: new Date().toISOString(),
                itemsJson: JSON.stringify(itemsWithTotal)
            });
        } catch (e) {
            console.error('Failed to save invoice record', e);
        }

        // Download
        const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `Invoice_${project.name.replace(/\s+/g, '_')}.pdf`;
        link.click();
        setIsInvoiceModalOpen(false);
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...invoiceForm.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setInvoiceForm({ ...invoiceForm, items: newItems });
    };

    const addItem = () => {
        setInvoiceForm({
            ...invoiceForm,
            items: [...invoiceForm.items, { description: 'New Item', quantity: 1, unitPrice: 0 }]
        });
    };

    const removeItem = (index: number) => {
        const newItems = [...invoiceForm.items];
        newItems.splice(index, 1);
        setInvoiceForm({ ...invoiceForm, items: newItems });
    };

    if (!project) return <div className="p-8">Loading...</div>;

    const completedCount = patients?.filter(p => p.status === 'completed').length || 0;
    const progressCount = patients?.filter(p => p.status === 'in_progress').length || 0;
    const waitingCount = patients?.filter(p => p.status === 'waiting').length || 0;
    const totalCount = patients?.length || 0;

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/admin/projects" className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ArrowLeft className="w-6 h-6 text-slate-500" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                    <div className="flex items-center gap-2 text-slate-500 text-sm">
                        <Briefcase className="w-3 h-3" />
                        <span>{project.clientName}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                            {project.status}
                        </span>
                    </div>
                </div>
                <div className="ml-auto flex gap-2">
                    <button
                        onClick={handleDeleteProject}
                        className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2 text-sm font-bold transition outline-none"
                    >
                        <Trash2 className="w-4 h-4" /> Delete Project
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* QR Code Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 lg:col-span-1">
                    <div className="flex items-center gap-2 mb-4">
                        <QrCode className="w-5 h-5 text-slate-900" />
                        <h2 className="font-bold text-slate-800">Check-in QR Code</h2>
                    </div>

                    <div className="flex flex-col items-center gap-4 py-4 bg-slate-50 rounded-lg border border-slate-100">
                        {qrDataUrl ? (
                            <img src={qrDataUrl} alt="Project QR" className="w-48 h-48 mix-blend-multiply" />
                        ) : (
                            <div className="w-48 h-48 bg-slate-200 animate-pulse rounded" />
                        )}
                        <p className="text-xs text-slate-500 px-4 text-center">
                            Scan to check in specifically for "{project.name}"
                        </p>
                    </div>

                    <button
                        onClick={printQr}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition"
                    >
                        <Printer className="w-4 h-4" /> Print QR
                    </button>

                    <button
                        onClick={openInvoiceModal}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition"
                    >
                        <Receipt className="w-4 h-4" /> Generate Invoice
                    </button>

                    <Link
                        href={`/admin/projects/${projectId}/patients`}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                    >
                        <Users className="w-4 h-4" /> View Patient List
                    </Link>
                </div>

                {/* Details & Stats */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Info Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">Contact Person</h3>
                                <p className="font-medium flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-400" />
                                    {project.contactPerson || '-'}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">Created</h3>
                                <p className="font-medium">
                                    {new Date(project.timestamp).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="col-span-2">
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">Invoice Address</h3>
                                <p className="font-medium flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                    {project.invoiceAddress || '-'}
                                </p>
                            </div>

                            {project.defaultVaccineName && (
                                <div className="col-span-2 pt-4 border-t mt-2">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-1">Default Vaccine Info</h3>
                                    <div className="bg-slate-50 text-slate-900 p-3 rounded-lg text-sm grid grid-cols-3 gap-2 border border-slate-100">
                                        <div>
                                            <span className="block text-xs opacity-60">Vaccine</span>
                                            <span className="font-bold">{project.defaultVaccineName}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs opacity-60">Batch</span>
                                            <span className="font-bold">{project.defaultBatch || '-'}</span>
                                        </div>
                                        <div>
                                            <span className="block text-xs opacity-60">Expiry</span>
                                            <span className="font-bold">{project.defaultExpiry || '-'}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase">Total</h3>
                            <p className="text-2xl font-bold text-slate-900">{totalCount}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase">Waiting</h3>
                            <p className="text-2xl font-bold text-orange-600">{waitingCount}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase">In Progress</h3>
                            <p className="text-2xl font-bold text-slate-700">{progressCount}</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-center">
                            <h3 className="text-xs font-bold text-slate-400 uppercase">Completed</h3>
                            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                        </div>
                    </div>

                    {/* Patients List */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-2">
                                <Users className="w-5 h-5 text-slate-600" />
                                <h2 className="font-bold text-slate-800">Recent Check-ins</h2>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                            {patients?.map(p => (
                                <Link href={`/admin/patient/${p.id}`} key={p.id} className="block p-4 hover:bg-slate-50 transition flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-slate-900">{p.fullName}</p>
                                        <div className="flex items-center gap-2 text-sm text-slate-500">
                                            <span>{p.mykad}</span>
                                            <span className="text-xs text-slate-400">• {new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${p.status === 'completed' ? 'bg-green-100 text-green-700' :
                                        p.status === 'in_progress' ? 'bg-slate-100 text-slate-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                        {p.status}
                                    </span>
                                </Link>
                            ))}
                            {patients?.length === 0 && (
                                <div className="p-8 text-center text-slate-400">
                                    No patients checked in for this project yet.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>

            {/* Invoice Modal */}
            {
                isInvoiceModalOpen && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-in zoom-in duration-200">
                            <h2 className="text-xl font-bold mb-4">Generate Invoice</h2>
                            <p className="text-sm text-slate-500 mb-4">
                                Create an invoice for <b>{project.clientName}</b> based on completed patients.
                            </p>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Invoice No</label>
                                    <input
                                        value={invoiceForm.invoiceNumber}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                                        className="w-full p-2 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-slate-900 outline-none bg-white text-black"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Date</label>
                                    <input
                                        value={invoiceForm.date}
                                        onChange={e => setInvoiceForm({ ...invoiceForm, date: e.target.value })}
                                        className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-slate-900 outline-none bg-white text-black"
                                    />
                                </div>
                            </div>

                            <div className="mb-4">
                                <label className="block text-xs font-bold text-slate-500 mb-1">Bill To (Client)</label>
                                <input
                                    value={invoiceForm.clientName}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, clientName: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm mb-2 font-bold focus:ring-2 focus:ring-slate-900 outline-none bg-white text-black"
                                    placeholder="Client Name"
                                />
                                <textarea
                                    value={invoiceForm.clientAddress}
                                    onChange={e => setInvoiceForm({ ...invoiceForm, clientAddress: e.target.value })}
                                    className="w-full p-2 border rounded-lg text-sm h-16 resize-none focus:ring-2 focus:ring-slate-900 outline-none bg-white text-black"
                                    placeholder="Address"
                                />
                            </div>

                            <div className="mb-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label className="block text-xs font-bold text-slate-500">Items</label>
                                    <button onClick={addItem} className="text-xs text-slate-900 font-bold hover:underline">+ Add Item</button>
                                </div>
                                <div className="bg-slate-50 p-2 rounded-lg space-y-2 max-h-[200px] overflow-y-auto">
                                    {invoiceForm.items.map((item, index) => (
                                        <div key={index} className="flex gap-2 items-start bg-white p-2 rounded border border-slate-100 shadow-sm">
                                            <div className="flex-1">
                                                <input
                                                    value={item.description}
                                                    onChange={e => updateItem(index, 'description', e.target.value)}
                                                    className="w-full p-1 border-b border-transparent hover:border-slate-200 focus:border-slate-500 outline-none text-sm font-medium bg-white text-black"
                                                    placeholder="Description"
                                                />
                                                <div className="flex gap-2 mt-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-slate-400">Qty</span>
                                                        <input
                                                            type="number"
                                                            value={item.quantity}
                                                            onChange={e => updateItem(index, 'quantity', Number(e.target.value))}
                                                            className="w-16 p-1 bg-slate-50 rounded text-xs text-center font-bold focus:ring-2 focus:ring-slate-900 outline-none text-black"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-slate-400">Price (RM)</span>
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={e => updateItem(index, 'unitPrice', Number(e.target.value))}
                                                            className="w-20 p-1 bg-slate-50 rounded text-xs text-right font-bold focus:ring-2 focus:ring-slate-900 outline-none text-black"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className="text-sm font-bold text-slate-700">
                                                    RM {(item.quantity * item.unitPrice).toFixed(2)}
                                                </span>
                                                <button onClick={() => removeItem(index)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>


                            <div className="flex justify-between items-center bg-slate-100 p-4 rounded-lg">
                                <span className="font-bold text-lg text-slate-600">Grand Total</span>
                                <span className="font-bold text-2xl text-slate-900">
                                    RM {invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2)}
                                </span>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setIsInvoiceModalOpen(false)}
                                    className="flex-1 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-lg border border-slate-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleGenerateInvoice}
                                    className="flex-1 py-3 bg-black text-white font-bold rounded-lg hover:bg-neutral-800"
                                >
                                    Download Invoice
                                </button>
                            </div>
                        </div>
                    </div>
                )}
        </div >
    );
}
