'use client';

import React, { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useLanguage } from '@/contexts/LanguageContext';
import { Search, Calendar, FileText, Filter, Download, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const [selectedProject, setSelectedProject] = useState<number | 'all'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const projects = useLiveQuery(() => db.projects.toArray());

    const projectMap = useMemo(() => {
        if (!projects) return {};
        return projects.reduce((acc, p) => {
            if (p.id) acc[p.id] = `${p.name} (${p.clientName})`;
            return acc;
        }, {} as Record<number, string>);
    }, [projects]);

    const records = useLiveQuery(async () => {
        // Start with all completed
        let collection = await db.checkins
            .where('status').equals('completed')
            .reverse()
            .sortBy('timestamp');

        // Filter in memory (Dexie limitation for complex multi-field filtering without compound indices)
        return collection.filter(c => {
            // Drive Filter
            if (selectedProject !== 'all' && c.projectId !== selectedProject) return false;

            // Date Filter
            if (startDate) {
                const start = new Date(startDate).setHours(0, 0, 0, 0);
                if (c.timestamp < start) return false;
            }
            if (endDate) {
                const end = new Date(endDate).setHours(23, 59, 59, 999);
                if (c.timestamp > end) return false;
            }

            // Text Search
            if (search) {
                const q = search.toLowerCase();
                return (
                    c.fullName.toLowerCase().includes(q) ||
                    c.mykad.includes(q) ||
                    (c.batch && c.batch.toLowerCase().includes(q))
                );
            }
            return true;
        });
    }, [search, selectedProject, startDate, endDate]);

    const handleExport = () => {
        if (!records) return;
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Date,Time,Drive,Name,MyKad,Vaccine,Batch,Site,Route,Status\n"
            + records.map(e => {
                const date = new Date(e.timestamp);
                const project = e.projectId ? projectMap[e.projectId] || 'Unknown' : 'Walk-in';
                return `"${date.toLocaleDateString()}","${date.toLocaleTimeString()}","${project}","${e.fullName}","${e.mykad}","${e.vaccineName || ''}","${e.batch || ''}","${e.site || ''}","${e.route || ''}","${e.status}"`;
            }).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `vaccine_history_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!records) return <div className="p-8">Loading history...</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900">{t.history}</h1>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition"
                >
                    <Download className="w-4 h-4" /> Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search name, IC, batch..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div>
                    <select
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedProject}
                        onChange={(e) => setSelectedProject(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                    >
                        <option value="all">All Drives</option>
                        {projects?.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <input
                        type="date"
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        placeholder="Start Date"
                    />
                </div>

                <div>
                    <input
                        type="date"
                        className="w-full p-2 rounded-lg border border-slate-200 bg-white text-black focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        placeholder="End Date"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Date</th>
                                <th className="px-6 py-4 font-bold text-slate-700 whitespace-nowrap">Drive</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Patient</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Vaccine</th>
                                <th className="px-6 py-4 font-bold text-slate-700">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {records.map(r => (
                                <tr key={r.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-400" />
                                            <div className="flex flex-col">
                                                <span>{new Date(r.timestamp).toLocaleDateString()}</span>
                                                <span className="text-xs text-slate-400">{new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {r.projectId ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                                                {projectMap[r.projectId] || 'Unknown Drive'}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">Walk-in</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{r.fullName}</div>
                                        <div className="text-xs text-slate-400">{r.mykad}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {r.vaccineName ? (
                                            <div>
                                                <div className="text-slate-900">{r.vaccineName}</div>
                                                <div className="text-xs text-slate-500 font-mono">{r.batch}</div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link href={`/admin/patient/${r.id}`} className="inline-flex items-center gap-1 font-bold text-slate-900 hover:underline">
                                            Manage
                                            <ArrowRight className="w-3 h-3" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {records.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>No records match your filters.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
