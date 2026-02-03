'use client';

import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ArrowLeft, Users, CheckCircle, FileText, Download, FileDown } from 'lucide-react';
import Link from 'next/link';
import { generateCertificatePDF } from '@/lib/pdfGenerator';
import JSZip from 'jszip';

export default function ClientProjectPage({ params }: { params: { projectId: string } }) {
    const { client, isAuthenticated, isLoading } = useClientAuth();
    const router = useRouter();
    const projectId = parseInt(params.projectId);

    React.useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/client');
        }
    }, [isAuthenticated, isLoading, router]);

    // Fetch project
    const project = useLiveQuery(async () => {
        if (!client?.id) return null;
        const proj = await db.projects.get(projectId);
        // Verify this project belongs to the client
        if (proj && proj.clientAccountId === client.id) {
            return proj;
        }
        return null;
    }, [client?.id, projectId]);

    // Fetch patients for this project (only names + certificates)
    const patients = useLiveQuery(async () => {
        if (!project) return [];
        const allPatients = await db.checkins.toArray();
        return allPatients.filter(p => p.projectId === projectId);
    }, [projectId, project]);

    // Fetch invoices
    const invoices = useLiveQuery(async () => {
        if (!project) return [];
        const allInvoices = await db.invoices.toArray();
        return allInvoices.filter(inv => inv.projectId === projectId);
    }, [projectId, project]);

    if (isLoading || !client) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!project) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Project Not Found</h1>
                    <p className="text-slate-600 mb-4">You don't have access to this project.</p>
                    <Link href="/client/dashboard" className="text-blue-600 hover:underline">
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    const completedPatients = patients?.filter(p => p.status === 'completed').length || 0;
    const totalInvoiced = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0;

    const handleDownloadCertificate = async (certificateId: string, patientName: string) => {
        try {
            const response = await fetch(`/api/certificates?id=${certificateId}`);
            if (!response.ok) {
                alert('Certificate not found');
                return;
            }
            const cert = await response.json();
            const bytes = await generateCertificatePDF(cert);
            const blob = new Blob([bytes], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Certificate-${patientName}.pdf`;
            link.click();
        } catch (error) {
            console.error('Error downloading certificate:', error);
            alert('Failed to download certificate');
        }
    };

    const handleDownloadAllCertificates = async () => {
        const completedWithCerts = patients?.filter(p => p.status === 'completed' && p.certificateId) || [];

        if (completedWithCerts.length === 0) {
            alert('No certificates available to download');
            return;
        }

        try {
            const zip = new JSZip();

            for (const patient of completedWithCerts) {
                const response = await fetch(`/api/certificates?id=${patient.certificateId}`);
                if (response.ok) {
                    const cert = await response.json();
                    const bytes = await generateCertificatePDF(cert);
                    zip.file(`Certificate-${patient.fullName}.pdf`, bytes);
                }
            }

            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(zipBlob);
            link.download = `${project?.name || 'Project'}-Certificates.zip`;
            link.click();
        } catch (error) {
            console.error('Error creating ZIP:', error);
            alert('Failed to download certificates');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-6">
                    <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 font-bold mb-4">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Dashboard
                    </Link>
                    <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
                    <p className="text-slate-600">{project.clientName}</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Total Patients</div>
                        <div className="text-3xl font-black text-slate-900">{patients?.length || 0}</div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-green-100 bg-green-50/50">
                        <div className="text-green-600 text-sm font-bold uppercase tracking-wider mb-2">Completed</div>
                        <div className="text-3xl font-black text-green-700">{completedPatients}</div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-2">Invoiced</div>
                        <div className="text-3xl font-black text-slate-900">RM {totalInvoiced.toFixed(2)}</div>
                    </div>
                </div>

                {/* Patient List - Limited Info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Vaccinated Patients
                        </h2>
                        {patients && patients.filter(p => p.status === 'completed' && p.certificateId).length > 0 && (
                            <button
                                onClick={handleDownloadAllCertificates}
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-neutral-800 transition"
                            >
                                <FileDown className="w-4 h-4" />
                                Download All Certificates
                            </button>
                        )}
                    </div>
                    {!patients || patients.filter(p => p.status === 'completed').length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            No completed vaccinations yet
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left">
                                        <th className="pb-3 text-xs font-bold text-slate-700 uppercase">Patient Name</th>
                                        <th className="pb-3 text-xs font-bold text-slate-700 uppercase">Vaccination Date</th>
                                        <th className="pb-3 text-xs font-bold text-slate-700 uppercase">Certificate ID</th>
                                        <th className="pb-3 text-xs font-bold text-slate-700 uppercase">Dose</th>
                                        <th className="pb-3 text-xs font-bold text-slate-700 uppercase text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {patients.filter(p => p.status === 'completed').map(patient => (
                                        <tr key={patient.id} className="border-b border-slate-100">
                                            <td className="py-3 text-sm font-medium text-slate-900">{patient.fullName}</td>
                                            <td className="py-3 text-sm text-slate-600">
                                                {patient.administeredAt
                                                    ? new Date(patient.administeredAt).toLocaleDateString()
                                                    : new Date(patient.timestamp).toLocaleDateString()
                                                }
                                            </td>
                                            <td className="py-3 text-sm text-slate-600 font-mono">
                                                {patient.certificateId || '—'}
                                            </td>
                                            <td className="py-3 text-sm text-slate-600">Dose {patient.dose}</td>
                                            <td className="py-3 text-right">
                                                {patient.certificateId && (
                                                    <button
                                                        onClick={() => handleDownloadCertificate(patient.certificateId!, patient.fullName)}
                                                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                        title="Download Certificate"
                                                    >
                                                        <Download className="w-3 h-3" />
                                                        Download
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Invoices */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Invoices
                    </h2>
                    {!invoices || invoices.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            No invoices yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invoices.map(invoice => (
                                <div key={invoice.id} className="p-4 border border-slate-200 rounded-lg flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-slate-900">{invoice.invoiceNumber}</div>
                                        <div className="text-sm text-slate-500">
                                            {new Date(invoice.date).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xl font-black text-slate-900">RM {invoice.amount.toFixed(2)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
