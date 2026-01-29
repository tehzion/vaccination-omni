'use client';

import React, { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import { Search, ChevronRight, Clock, CheckCircle2, CircleDashed, Upload, FileSpreadsheet, Download } from 'lucide-react';
import { generateQueueNumber } from '@/lib/utils';
import { importPatientsFromExcel, generateExcelTemplate } from '@/lib/excelImporter';
import { Modal } from '@/components/ui/Modals';
import { ClinicHeader } from '@/components/ui/ClinicHeader';

export default function AdminQueuePage() {
    const { t } = useLanguage();
    const [filter, setFilter] = React.useState('');
    const [showImportModal, setShowImportModal] = React.useState(false);
    const [selectedProject, setSelectedProject] = React.useState<number | undefined>(undefined);
    const [importFile, setImportFile] = React.useState<File | null>(null);
    const [isImporting, setIsImporting] = React.useState(false);
    const [importResult, setImportResult] = React.useState<any>(null);

    // Query today's checkins, reverse sorted by timestamp (newest first) ??? 
    // Actually usually oldest first for queue. But user said "newest first" in requirements? 
    // "Doctor sees a live queue/list of checked-in patients (search + filter)."
    // "Using a local-first database: IndexedDB via Dexie... Queue number resets daily"
    // Let's list by queue number (which implies time).

    const checkins = useLiveQuery(async () => {
        // Get all checkins from today (or last 24h? or just all waiting/in_progress?)
        // In a real app we filter by 'session' or 'day'. 
        // For MVP let's show all that are NOT completed, plus recent completed.

        // Simple: Get all. Sort by timestamp descending.
        const all = await db.checkins.orderBy('timestamp').reverse().toArray();

        // Filter
        return all.filter(c => {
            const match = c.fullName.toLowerCase().includes(filter.toLowerCase()) ||
                c.mykad.includes(filter) ||
                c.queueNumber.includes(filter);
            return match;
        });
    }, [filter]);

    const projects = useLiveQuery(async () => {
        return await db.projects.where('status').equals('active').toArray();
    });

    if (!checkins) return <div className="text-center p-8">Loading queue...</div>;

    const waiting = checkins.filter(c => c.status === 'waiting');
    const inProgress = checkins.filter(c => c.status === 'in_progress');
    const completed = checkins.filter(c => c.status === 'completed');

    // We show active queue (Waiting + In Progress) primarily.
    const activeQueue = [...inProgress, ...waiting];

    const handleDownloadTemplate = () => {
        const blob = generateExcelTemplate();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'patient_import_template.xlsx';
        link.click();
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setImportFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!importFile) return;

        setIsImporting(true);
        try {
            const existingCheckins = await db.checkins.toArray();
            const existingMyKads = new Set(existingCheckins.map(c => c.mykad));

            const result = await importPatientsFromExcel(importFile, {
                projectId: selectedProject,
                existingMyKads
            });

            // Bulk insert successful patients
            if (result.success.length > 0) {
                await db.checkins.bulkAdd(result.success);
            }

            setImportResult(result);
        } catch (error) {
            console.error('Import error:', error);
            setImportResult({
                success: [],
                skipped: [],
                errors: [{ row: 0, message: 'Failed to import file', data: null }]
            });
        } finally {
            setIsImporting(false);
        }
    };

    const closeImportModal = () => {
        setShowImportModal(false);
        setImportFile(null);
        setSelectedProject(undefined);
        setImportResult(null);
    };

    return (
        <div className="space-y-6">
            <ClinicHeader pageTitle={t.queue} subtitle="Manage patient check-ins and vaccinations" />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition"
                    >
                        <Download className="w-4 h-4" /> Template
                    </button>
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-black hover:bg-neutral-800 text-white font-bold rounded-lg transition"
                    >
                        <Upload className="w-4 h-4" /> Import Excel
                    </button>
                </div>
            </div>

            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                    type="text"
                    placeholder="Search name or ID..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex sm:flex-col justify-between items-center sm:items-start">
                    <div className="text-slate-500 text-xs uppercase font-bold tracking-wider">Waiting</div>
                    <div className="text-3xl font-black text-slate-900">{waiting.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 bg-blue-50/50 flex sm:flex-col justify-between items-center sm:items-start">
                    <div className="text-blue-600 text-xs uppercase font-bold tracking-wider">In Progress</div>
                    <div className="text-3xl font-black text-blue-700">{inProgress.length}</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex sm:flex-col justify-between items-center sm:items-start">
                    <div className="text-green-600 text-xs uppercase font-bold tracking-wider">Done <span className="hidden sm:inline">(Today)</span></div>
                    <div className="text-3xl font-black text-green-700">{completed.filter(c => new Date(c.timestamp).getDate() === new Date().getDate()).length}</div>
                </div>
            </div>

            {/* Queue List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {activeQueue.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        No active patients in queue.
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {activeQueue.map((patient) => (
                            <Link
                                key={patient.id}
                                href={`/admin/patient/${patient.id}`}
                                className="block p-4 hover:bg-slate-50 transition group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                      ${patient.status === 'in_progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}
                    `}>
                                            {patient.queueNumber.split('-')[1]}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition">{patient.fullName}</h3>
                                            <div className="flex items-center text-sm text-slate-500 gap-2">
                                                <span>{patient.mykad}</span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {new Date(patient.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {patient.status === 'in_progress' && (
                                            <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">In Progress</span>
                                        )}
                                        <ChevronRight className="w-5 h-5 text-slate-300" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Import Modal */}
            <Modal isOpen={showImportModal} onClose={closeImportModal} title="Import Patients from Excel">
                {!importResult ? (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                <FileSpreadsheet className="w-4 h-4 inline mr-1" />
                                Select Excel File
                            </label>
                            <input
                                type="file"
                                accept=".xlsx,.xls"
                                onChange={handleFileSelect}
                                className="w-full p-2 border rounded-lg bg-white text-black"
                            />
                            {importFile && (
                                <p className="text-xs text-slate-500 mt-1">Selected: {importFile.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Assign to Project (Optional)</label>
                            <select
                                value={selectedProject || ''}
                                onChange={(e) => setSelectedProject(e.target.value ? Number(e.target.value) : undefined)}
                                className="w-full p-2 border rounded-lg bg-white text-black"
                            >
                                <option value="">-- No Project (Walk-in) --</option>
                                {projects?.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.clientName})</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3 pt-4">
                            <button
                                onClick={closeImportModal}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!importFile || isImporting}
                                className="px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-neutral-800 disabled:opacity-50 transition"
                            >
                                {isImporting ? 'Importing...' : 'Import'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="text-center py-4">
                            <div className="text-4xl font-bold text-green-600 mb-2">
                                ✓ {importResult.success.length}
                            </div>
                            <div className="text-sm text-slate-600">Successfully imported</div>
                        </div>

                        {importResult.skipped.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                                <div className="text-sm font-bold text-yellow-800 mb-1">⚠ {importResult.skipped.length} Skipped</div>
                                <div className="text-xs text-yellow-700">Duplicate IC/MyKad numbers</div>
                            </div>
                        )}

                        {importResult.errors.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <div className="text-sm font-bold text-red-800 mb-1">✗ {importResult.errors.length} Errors</div>
                                <div className="text-xs text-red-700 max-h-24 overflow-y-auto">
                                    {importResult.errors.slice(0, 5).map((err: any, i: number) => (
                                        <div key={i}>Row {err.row}: {err.message}</div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={closeImportModal}
                            className="w-full py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-black transition"
                        >
                            Close
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
}
