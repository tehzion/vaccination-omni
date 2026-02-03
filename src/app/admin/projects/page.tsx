'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useLanguage } from '@/contexts/LanguageContext';
import { useForm } from 'react-hook-form';
import { Plus, Briefcase, MapPin, User, Archive, CheckCircle, Calendar, Users, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import Link from 'next/link';
import { ClinicHeader } from '@/components/ui/ClinicHeader';

interface ProjectForm {
    name: string;
    clientName: string;
    invoiceAddress: string;
    contactPerson: string;
    contactEmail?: string;
    startDate?: string;
    endDate?: string;
    estimatedPatients?: number;
    // Vaccine Defaults
    defaultVaccineName?: string;
    defaultBatch?: string;
    defaultExpiry?: string;
}

export default function ProjectsPage() {
    const { t } = useLanguage();
    const { addToast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const { register, handleSubmit, reset } = useForm<ProjectForm>();

    const projects = useLiveQuery(() => db.projects.orderBy('timestamp').reverse().toArray());

    const onCreate = async (data: ProjectForm) => {
        try {
            await db.projects.add({
                ...data,
                status: 'active',
                timestamp: Date.now()
            });
            addToast('Project created', 'success');
            setIsCreating(false);
            reset();
        } catch (e) {
            addToast('Error creating project', 'error');
        }
    };

    const handleApprove = async (projectId: number) => {
        try {
            await db.projects.update(projectId, { status: 'active' });
            addToast('Booking request approved', 'success');
        } catch (e) {
            addToast('Error approving request', 'error');
        }
    };

    const handleReject = async (projectId: number) => {
        if (confirm('Are you sure you want to reject this booking request?')) {
            try {
                await db.projects.update(projectId, { status: 'rejected' });
                addToast('Booking request rejected', 'success');
            } catch (e) {
                addToast('Error rejecting request', 'error');
            }
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <ClinicHeader pageTitle="Vaccination Drives" subtitle="Manage vaccination drives and invoicing" />
            <div className="flex justify-between items-center">
                <button
                    onClick={() => setIsCreating(!isCreating)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition"
                >
                    <Plus className="w-4 h-4" /> New Drive
                </button>
            </div>

            {isCreating && (
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-lg mb-4">Create New Drive</h2>
                    <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Drive/Trip Name *</label>
                                <input {...register('name', { required: true })} className="w-full p-2 border rounded-lg bg-white text-black" placeholder="e.g. Annual Health Screening 2024" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name (for Invoicing) *</label>
                                <input {...register('clientName', { required: true })} className="w-full p-2 border rounded-lg bg-white text-black" placeholder="e.g. ABC Corporation Sdn Bhd" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                                <input {...register('contactPerson')} className="w-full p-2 border rounded-lg bg-white text-black" placeholder="Mr. John Doe" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                                <input {...register('contactEmail')} type="email" className="w-full p-2 border rounded-lg bg-white text-black" placeholder="contact@organization.com" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Address</label>
                                <textarea {...register('invoiceAddress')} className="w-full p-2 border rounded-lg h-20 bg-white text-black" placeholder="123 Jalan ABC, 50000 Kuala Lumpur" />
                            </div>

                            {/* Project Details */}
                            <div className="md:col-span-2 border-t pt-4 mt-2">
                                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    Drive Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                                        <input {...register('startDate')} type="date" className="w-full p-2 border rounded-lg bg-white text-black" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                        <input {...register('endDate')} type="date" className="w-full p-2 border rounded-lg bg-white text-black" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Patients</label>
                                        <input {...register('estimatedPatients')} type="number" min="0" className="w-full p-2 border rounded-lg bg-white text-black" placeholder="50" />
                                    </div>
                                </div>
                            </div>

                            {/* Vaccine Defaults Section */}
                            <div className="md:col-span-2 border-t pt-4 mt-2">
                                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                                    <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">V</span>
                                    Default Vaccine Info (Optional)
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Vaccine Name</label>
                                        <input {...register('defaultVaccineName')} className="w-full p-2 border rounded-lg bg-white text-black" placeholder="e.g. Comirnaty" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Batch</label>
                                        <input {...register('defaultBatch')} className="w-full p-2 border rounded-lg bg-white text-black" placeholder="Batch 123" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Expiry</label>
                                        <input {...register('defaultExpiry')} type="date" className="w-full p-2 border rounded-lg bg-white text-black" />
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 mt-2">These will be auto-filled for any patient checking in under this project.</p>
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <button type="button" onClick={() => setIsCreating(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-black font-bold">Create Drive</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Pending Booking Requests */}
            {projects?.some(p => p.status === 'pending_approval') && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Clock className="w-5 h-5 text-amber-600" />
                        <h2 className="text-lg font-bold text-amber-900">Pending Booking Requests</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        {projects?.filter(p => p.status === 'pending_approval').map((project) => (
                            <div key={project.id} className="bg-white p-6 rounded-xl border border-amber-200">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900 mb-1">{project.name}</h3>
                                        <p className="text-sm text-slate-500 flex items-center gap-1">
                                            <Briefcase className="w-3 h-3" /> {project.clientName || 'No Client Info'}
                                        </p>
                                        {project.startDate && (
                                            <p className="text-sm text-slate-600 flex items-center gap-1 mt-2">
                                                <Calendar className="w-3 h-3" /> Requested: {new Date(project.startDate).toLocaleDateString()}
                                            </p>
                                        )}
                                        {project.estimatedPatients && (
                                            <p className="text-sm text-slate-600 flex items-center gap-1 mt-1">
                                                <Users className="w-3 h-3" /> Est. {project.estimatedPatients} participants
                                            </p>
                                        )}
                                    </div>
                                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                                        <Clock className="w-3 h-3" />
                                        Pending
                                    </span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleApprove(project.id!)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                                    >
                                        <ThumbsUp className="w-4 h-4" />
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleReject(project.id!)}
                                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition"
                                    >
                                        <ThumbsDown className="w-4 h-4" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects?.filter(p => p.status === 'active').map((project) => (
                    <Link href={`/admin/projects/${project.id}`} key={project.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-slate-900 transition group block">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-900 transition">{project.name}</h3>
                                <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                    <Briefcase className="w-3 h-3" /> {project.clientName || 'No Client Info'}
                                </p>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {project.status}
                            </span>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 border-t border-slate-100 pt-3">
                            {project.invoiceAddress && (
                                <div className="flex gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    <span className="line-clamp-2">{project.invoiceAddress}</span>
                                </div>
                            )}
                            {project.contactPerson && (
                                <div className="flex gap-2">
                                    <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                    <span>{project.contactPerson}</span>
                                </div>
                            )}
                            {project.defaultVaccineName && (
                                <div className="flex gap-2 text-slate-900 font-bold">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">Default: {project.defaultVaccineName}</span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-400">
                            Created {new Date(project.timestamp).toLocaleDateString()}
                        </div>
                    </Link>
                ))}

                {projects?.length === 0 && !isCreating && (
                    <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50 rounded-xl border-dashed border-2 border-slate-200">
                        No projects found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
