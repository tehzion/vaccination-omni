'use client';

import React, { useEffect, useState, use } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CheckCircle, XCircle, ShieldCheck, Download } from 'lucide-react';
import { generateCertificatePDF } from '@/lib/pdfGenerator';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function VerifyPage({ params }: PageProps) {
    const { id } = use(params);
    const [cert, setCert] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`/api/certificates?id=${id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) setError(data.error);
                else setCert(data);
            })
            .catch(() => setError('Failed to verify'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDownload = async () => {
        if (!cert) return;
        try {
            const bytes = await generateCertificatePDF(cert);
            const blob = new Blob([bytes as any], { type: 'application/pdf' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Certificate-${cert.patientName}.pdf`;
            link.click();
        } catch (e) {
            alert('Download failed');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Verifying...</div>;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
                <div className={`p-6 text-center ${error ? 'bg-red-50' : 'bg-green-50'}`}>
                    {error ? (
                        <div className="flex justify-center mb-4"><XCircle className="w-16 h-16 text-red-500" /></div>
                    ) : (
                        <div className="flex justify-center mb-4"><ShieldCheck className="w-16 h-16 text-green-500" /></div>
                    )}
                    <h1 className={`text-2xl font-bold ${error ? 'text-red-700' : 'text-green-700'}`}>
                        {error ? 'Invalid Certificate' : 'Certificate Verified'}
                    </h1>
                </div>

                {!error && cert && (
                    <div className="p-6 space-y-4">
                        <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Name</p>
                            <p className="font-bold text-slate-900 text-lg">{cert.patientName}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ID (Masked)</p>
                                <p className="font-medium text-slate-800">{cert.patientId.slice(0, 4)} **** {cert.patientId.slice(-4)}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date</p>
                                <p className="font-medium text-slate-800">{new Date(cert.date).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="pt-4 border-t border-slate-100">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Vaccine</p>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                <p className="font-bold text-blue-900">{cert.vaccineName}</p>
                                <p className="text-sm text-blue-700">Batch: {cert.batch}</p>
                            </div>
                        </div>

                        <button
                            onClick={handleDownload}
                            className="w-full mt-4 py-3 bg-slate-900 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-black transition"
                        >
                            <Download className="w-4 h-4" /> Download PDF
                        </button>
                    </div>
                )}

                {error && (
                    <div className="p-6 text-center text-slate-500">
                        The certificate ID provided could not be found or has been revoked.
                    </div>
                )}
            </div>
        </div>
    );
}
