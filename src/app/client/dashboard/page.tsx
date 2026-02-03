'use client';

import React from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { LogOut, Building2, Users, CheckCircle, DollarSign, FileText, Calendar, Plus, Clock, User } from 'lucide-react';
import Link from 'next/link';

export default function ClientDashboardPage() {
    const { client, isAuthenticated, logout, isLoading } = useClientAuth();
    const router = useRouter();

    React.useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/client');
        }
    }, [isAuthenticated, isLoading, router]);

    // Fetch active projects assigned to this client
    const projects = useLiveQuery(async () => {
        if (!client?.id) return [];
        return await db.projects
            .where('clientAccountId')
            .equals(client.id)
            .and(p => p.status === 'active')
            .toArray();
    }, [client?.id]);

    // Fetch pending requests
    const pendingRequests = useLiveQuery(async () => {
        if (!client?.id) return [];
        return await db.projects
            .where('clientAccountId')
            .equals(client.id)
            .and(p => p.status === 'pending_approval')
            .toArray();
    }, [client?.id]);

    // Fetch all patients for client's projects
    const patients = useLiveQuery(async () => {
        if (!client?.id || !projects) return [];
        const projectIds = projects.map(p => p.id!);
        const allPatients = await db.checkins.toArray();
        return allPatients.filter(p => p.projectId && projectIds.includes(p.projectId));
    }, [client?.id, projects]);

    // Fetch invoices
    const invoices = useLiveQuery(async () => {
        if (!client?.id || !projects) return [];
        const projectIds = projects.map(p => p.id!);
        const allInvoices = await db.invoices.toArray();
        return allInvoices.filter(inv => projectIds.includes(inv.projectId));
    }, [client?.id, projects]);

    if (isLoading || !client) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    Loading...
                </div>
            </div>
        );
    }

    const completedPatients = patients?.filter(p => p.status === 'completed').length || 0;
    const totalRevenue = invoices?.reduce((sum, inv) => sum + inv.amount, 0) || 0;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                                {client.type === 'company' ? (
                                    <Building2 className="w-5 h-5 text-white" />
                                ) : (
                                    <User className="w-5 h-5 text-white" />
                                )}
                            </div>
                            <div>
                                {client.type === 'company' ? (
                                    <>
                                        <h1 className="text-xl font-bold text-slate-900">{client.company || client.name}</h1>
                                        <p className="text-sm text-slate-500">{client.name}</p>
                                    </>
                                ) : (
                                    <h1 className="text-xl font-bold text-slate-900">{client.name}</h1>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                href="/client/request-booking"
                                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-neutral-800 transition"
                            >
                                <Plus className="w-4 h-4" />
                                Request New Booking
                            </Link>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-slate-500 text-sm font-bold uppercase tracking-wider">Projects</div>
                            <Building2 className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="text-3xl font-black text-slate-900">{projects?.length || 0}</div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-slate-500 text-sm font-bold uppercase tracking-wider">Vaccinated</div>
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                        <div className="text-3xl font-black text-green-700">{completedPatients}</div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Invoiced</div>
                            <DollarSign className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="text-3xl font-black text-slate-900">RM {totalRevenue.toFixed(2)}</div>
                    </div>
                </div>

                {/* Pending Requests */}
                {pendingRequests && pendingRequests.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Clock className="w-5 h-5 text-amber-600" />
                            <h2 className="text-lg font-bold text-amber-900">Pending Booking Requests</h2>
                        </div>
                        <div className="space-y-3">
                            {pendingRequests.map(request => (
                                <div key={request.id} className="bg-white p-4 border border-amber-200 rounded-lg">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-slate-900">{request.name}</h3>
                                            <p className="text-sm text-slate-500 mt-1">
                                                {request.startDate && `Requested Date: ${new Date(request.startDate).toLocaleDateString()}`}
                                                {request.estimatedPatients && ` • ${request.estimatedPatients} participants`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                                <Clock className="w-3 h-3" />
                                                Pending Review
                                            </span>
                                            <div className="text-xs text-slate-500 mt-2">
                                                Submitted {new Date(request.timestamp).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-amber-700 mt-4">
                            Our team is reviewing your request(s). We'll contact you within 24-48 hours.
                        </p>
                    </div>
                )}

                {/* Projects List */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Active Projects</h2>
                    {!projects || projects.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            No active projects yet
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {projects.map(project => {
                                const projectPatients = patients?.filter(p => p.projectId === project.id) || [];
                                const projectCompleted = projectPatients.filter(p => p.status === 'completed').length;

                                return (
                                    <Link
                                        key={project.id}
                                        href={`/client/project/${project.id}`}
                                        className="block p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-slate-900">{project.name}</h3>
                                                <p className="text-sm text-slate-500">{projectPatients.length} patients • {projectCompleted} vaccinated</p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-500">Created</div>
                                                <div className="text-sm font-medium text-slate-700">
                                                    {new Date(project.timestamp).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Recent Invoices */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Invoices</h2>
                    {!invoices || invoices.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            No invoices yet
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-slate-200 text-left">
                                        <th className="pb-3 text-xs font-bold text-slate-700 uppercase">Invoice #</th>
                                        <th className="pb-3 text-xs font-bold text-slate-700 uppercase">Date</th>
                                        <th className="pb-3 text-xs font-bold text-slate-700 uppercase">Project</th>
                                        <th className="pb-3 text-xs font-bold text-slate-700 uppercase text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.slice(0, 10).map(invoice => {
                                        const project = projects?.find(p => p.id === invoice.projectId);
                                        return (
                                            <tr key={invoice.id} className="border-b border-slate-100">
                                                <td className="py-3 text-sm font-medium text-slate-900">{invoice.invoiceNumber}</td>
                                                <td className="py-3 text-sm text-slate-600">{new Date(invoice.date).toLocaleDateString()}</td>
                                                <td className="py-3 text-sm text-slate-600">{project?.name || 'Unknown'}</td>
                                                <td className="py-3 text-sm font-bold text-slate-900 text-right">RM {invoice.amount.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
