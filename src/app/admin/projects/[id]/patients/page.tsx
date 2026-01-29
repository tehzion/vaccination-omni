'use client';

import React, { use, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { ArrowLeft, Download, Filter, CheckCircle, Clock, FileSpreadsheet, Users, Search, CheckCheck, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { exportPatientListToExcel } from '@/lib/patientListExporter';
import { ClinicHeader } from '@/components/ui/ClinicHeader';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function ProjectPatientsPage({ params }: PageProps) {
    const { id } = use(params);
    const projectId = Number(id);
    const [patientFilter, setPatientFilter] = useState<'all' | 'vaccinated' | 'pending'>('all');
    const [patientSearch, setPatientSearch] = useState('');
    const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const router = useRouter();

    // Handle export with feedback
    const handleExport = () => {
        const success = exportPatientListToExcel(patients || [], project?.name || 'Project', patientFilter);
        setExportStatus(success ? 'success' : 'error');
        setTimeout(() => setExportStatus('idle'), 3000);
    };

    const project = useLiveQuery(async () => {
        if (!projectId) return undefined;
        return await db.projects.get(projectId);
    }, [projectId]);

    const patients = useLiveQuery(async () => {
        if (!projectId) return [];
        return await db.checkins.where('projectId').equals(projectId).reverse().sortBy('timestamp');
    }, [projectId]);

    if (!project) return <div className="p-8">Loading...</div>;

    const completedCount = patients?.filter(p => p.status === 'completed').length || 0;
    const progressCount = patients?.filter(p => p.status === 'in_progress').length || 0;
    const waitingCount = patients?.filter(p => p.status === 'waiting').length || 0;
    const totalCount = patients?.length || 0;

    // Apply filters
    const filteredPatients = patients?.filter(p => {
        // Apply status filter
        if (patientFilter === 'vaccinated' && p.status !== 'completed') return false;
        if (patientFilter === 'pending' && p.status === 'completed') return false;
        // Apply search
        if (patientSearch && !p.fullName.toLowerCase().includes(patientSearch.toLowerCase()) && !p.mykad.includes(patientSearch)) return false;
        return true;
    }) || [];

    return (
        <div className="space-y-6 pb-20">
            <ClinicHeader pageTitle={`Patient List - ${project.name}`} subtitle={`Manage patients for ${project.clientName}`} />

            {/* Back Button and Stats */}
            <div className="flex items-center justify-between">
                <Link href={`/admin/projects/${projectId}`} className="flex items-center gap-2 text-slate-600 hover:text-black font-bold transition">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Project
                </Link>

                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="font-bold">{totalCount} Total Patients</span>
                    </div>
                </div>
            </div>

            {/* Filters and Export */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={() => setPatientFilter('all')}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition ${patientFilter === 'all'
                                ? 'bg-black text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            All ({totalCount})
                        </button>
                        <button
                            onClick={() => setPatientFilter('vaccinated')}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-1 ${patientFilter === 'vaccinated'
                                ? 'bg-green-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <CheckCircle className="w-3 h-3" />
                            Vaccinated ({completedCount})
                        </button>
                        <button
                            onClick={() => setPatientFilter('pending')}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition flex items-center gap-1 ${patientFilter === 'pending'
                                ? 'bg-orange-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            <Clock className="w-3 h-3" />
                            Pending ({waitingCount + progressCount})
                        </button>
                    </div>

                    <button
                        onClick={handleExport}
                        disabled={filteredPatients.length === 0}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition ${filteredPatients.length === 0
                                ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                : exportStatus === 'success'
                                    ? 'bg-green-700 text-white'
                                    : exportStatus === 'error'
                                        ? 'bg-red-600 text-white'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                            }`}
                    >
                        {exportStatus === 'success' ? (
                            <><CheckCheck className="w-4 h-4" /> Exported!</>
                        ) : exportStatus === 'error' ? (
                            <><AlertCircle className="w-4 h-4" /> Export Failed</>
                        ) : (
                            <><Download className="w-4 h-4" /> Export to Excel</>
                        )}
                    </button>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or IC/MyKad..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg bg-white text-black font-medium"
                    />
                </div>
            </div>

            {/* Patient Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr className="border-b border-slate-200">
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">IC/MyKad</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Phone</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Vaccine</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Dose</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredPatients.map(p => (
                                <tr key={p.id} className="hover:bg-slate-50 transition">
                                    <td className="px-4 py-3">
                                        <Link href={`/admin/patient/${p.id}`} className="font-bold text-slate-900 hover:text-blue-600">
                                            {p.fullName}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{p.mykad}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{p.phone || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${p.status === 'completed' ? 'bg-green-100 text-green-700' :
                                            p.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{p.vaccineName || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{p.dose}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {p.administeredAt ? new Date(p.administeredAt).toLocaleDateString() : new Date(p.timestamp).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredPatients.length === 0 && (
                        <div className="p-8 text-center text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No patients found matching your criteria</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Footer */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">
                        Showing <strong>{filteredPatients.length}</strong> of <strong>{totalCount}</strong> patients
                    </span>
                    <span className="text-slate-600">
                        Vaccination Rate: <strong className="text-green-600">{totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : 0}%</strong>
                    </span>
                </div>
            </div>
        </div>
    );
}
