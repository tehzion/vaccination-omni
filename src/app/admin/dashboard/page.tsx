'use client';

import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import {
    Users,
    TrendingUp,
    AlertTriangle,
    Star,
    DollarSign,
    ArrowRight,
    Activity,
    Calendar,
    Briefcase
} from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
    // Data Fetching
    const patients = useLiveQuery(() => db.checkins.toArray());
    const inventory = useLiveQuery(() => db.inventory.toArray());
    const invoices = useLiveQuery(() => db.invoices.toArray());
    const projects = useLiveQuery(() => db.projects.toArray());

    if (!patients || !inventory || !invoices || !projects) {
        return <div className="p-8 animate-pulse">Loading analytics...</div>;
    }

    // Stats Calculations
    const totalPatients = patients.length;
    const completedPatients = patients.filter(p => p.status === 'completed').length;
    const today = new Date().toISOString().split('T')[0];
    const patientsToday = patients.filter(p => new Date(p.timestamp).toISOString().split('T')[0] === today).length;

    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.amount, 0);
    const lowStockCount = inventory.filter(i => i.count <= i.minThreshold).length;

    const feedbackItems = patients.filter(p => p.feedbackRating !== undefined);
    const avgRating = feedbackItems.length > 0
        ? (feedbackItems.reduce((sum, p) => sum + (p.feedbackRating || 0), 0) / feedbackItems.length).toFixed(1)
        : 'N/A';

    const stats = [
        { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/admin/projects' },
        { label: 'Today\'s Patients', value: patientsToday, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', link: '/admin/queue' },
        { label: 'Stock Alerts', value: lowStockCount, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', link: '/admin/inventory' },
        { label: 'Avg Rating', value: avgRating, icon: Star, color: 'text-purple-600', bg: 'bg-purple-50', link: '/admin/analysis' },
    ];

    return (
        <div className="space-y-8 pb-10">
            {/* Clinic Header */}
            <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Clinic Operations</h1>
                <p className="text-slate-500 text-sm">Overview of patient flow and inventory status.</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <Link href={stat.link} key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-200 transition-all group">
                        <div className="flex justify-between items-start">
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
                        </div>
                        <div className="mt-4">
                            <div className="text-2xl font-black text-slate-900">{stat.value}</div>
                            <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mt-1">{stat.label}</div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue & Growth Chart Placeholder/Simulated */}
                <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">Drive Performance</h2>
                            <p className="text-sm text-slate-500 font-medium">Revenue by campaign</p>
                        </div>
                        <div className="bg-slate-50 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 flex items-center gap-2 border border-slate-100">
                            System Status: Online
                        </div>
                    </div>

                    <div className="space-y-6">
                        {projects.slice(0, 5).map((project, i) => {
                            const projectInvoices = invoices.filter(inv => inv.projectId === project.id);
                            const projectRev = projectInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                            const percentage = totalRevenue > 0 ? (projectRev / totalRevenue) * 100 : 0;

                            return (
                                <div key={project.id} className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="font-bold text-slate-700">{project.name}</span>
                                        <span className="font-black text-slate-900">${projectRev.toLocaleString()}</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {projects.length === 0 && (
                            <div className="text-center py-10 text-slate-400">No project data available yet.</div>
                        )}
                    </div>
                </div>

                {/* Insights Panel */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        Quick Insights
                    </h2>

                    <div className="space-y-4">
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Inventory Health</h3>
                            {lowStockCount > 0 ? (
                                <p className="text-sm text-slate-700">You have <span className="text-amber-600 font-bold">{lowStockCount} items</span> with low stock. Replenish soon.</p>
                            ) : (
                                <p className="text-sm text-slate-700">All vaccine stocks are healthy.</p>
                            )}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Patient Feedback</h3>
                            <p className="text-sm text-slate-700">
                                {avgRating === 'N/A'
                                    ? "No feedback received yet."
                                    : `Your clinic is maintaining a ${avgRating}/5.0 satisfaction score.`}
                            </p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Operations</h3>
                            <p className="text-sm text-slate-700">
                                <span className="text-slate-900 font-bold">{completedPatients}</span> patients successfully vaccinated out of <span className="text-slate-900 font-bold">{totalPatients}</span>.
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/admin/analysis"
                        className="mt-6 w-full py-3 bg-slate-900 hover:bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-sm"
                    >
                        Data Analyst AI <TrendingUp className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
