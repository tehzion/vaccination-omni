'use client';

import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, hashPassword } from '@/lib/db';
import { ClinicHeader } from '@/components/ui/ClinicHeader';
import { Modal } from '@/components/ui/Modals';
import { Plus, Building2, Mail, Trash2, Edit, Key, User, UserPlus } from 'lucide-react';

export default function AdminClientsPage() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        type: 'company' as 'company' | 'individual',
        name: '',
        email: '',
        company: '',
        password: ''
    });

    const clientAccounts = useLiveQuery(() => db.clientAccounts.toArray());
    const projects = useLiveQuery(() => db.projects.toArray());

    const handleCreate = async () => {
        // Validate based on type
        if (!formData.name || !formData.email || !formData.password) {
            alert('Please fill in all required fields');
            return;
        }

        if (formData.type === 'company' && !formData.company) {
            alert('Please enter company name');
            return;
        }

        // Check if email already exists
        const existing = await db.clientAccounts.where('email').equals(formData.email.toLowerCase()).first();
        if (existing) {
            alert('Email already exists');
            return;
        }

        await db.clientAccounts.add({
            type: formData.type,
            name: formData.name,
            email: formData.email.toLowerCase(),
            company: formData.type === 'company' ? formData.company : undefined,
            password: hashPassword(formData.password),
            createdAt: Date.now()
        });

        setFormData({ type: 'company', name: '', email: '', company: '', password: '' });
        setShowCreateModal(false);
    };

    const handleDelete = async (id: number) => {
        if (confirm('Delete this client account? Their projects will remain but unlinked.')) {
            // Unlink projects
            const linkedProjects = await db.projects.where('clientAccountId').equals(id).toArray();
            for (const project of linkedProjects) {
                await db.projects.update(project.id!, { clientAccountId: undefined });
            }
            await db.clientAccounts.delete(id);
        }
    };

    const handleLinkProject = async (clientId: number, projectId: number | undefined) => {
        if (projectId) {
            await db.projects.update(projectId, { clientAccountId: clientId });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Client Accounts</h1>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-neutral-800 transition"
                >
                    <UserPlus className="w-4 h-4" />
                    New Client Account
                </button>
            </div>

            {!clientAccounts || clientAccounts.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                    <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600">No client accounts yet</p>
                    <p className="text-slate-400 text-sm">Create accounts to give business owners access to their project data</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {clientAccounts.map(client => {
                        const linkedProjects = projects?.filter(p => p.clientAccountId === client.id) || [];

                        return (
                            <div key={client.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-lg font-bold text-slate-900">{client.name}</h3>
                                            {client.type === 'company' ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                                                    <Building2 className="w-3 h-3" />
                                                    Company
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                                                    <User className="w-3 h-3" />
                                                    Individual
                                                </span>
                                            )}
                                        </div>
                                        {client.type === 'company' && client.company && (
                                            <p className="text-sm text-slate-600">{client.company}</p>
                                        )}
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                            <Mail className="w-3 h-3" />
                                            {client.email}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(client.id!)}
                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                        title="Delete client account"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="border-t border-slate-200 pt-4">
                                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                                        Linked Projects ({linkedProjects.length})
                                    </div>
                                    {linkedProjects.length > 0 ? (
                                        <div className="space-y-1">
                                            {linkedProjects.map(proj => (
                                                <div key={proj.id} className="text-sm text-slate-600 flex items-center gap-2">
                                                    <Building2 className="w-3 h-3" />
                                                    {proj.name}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400">No projects linked yet</p>
                                    )}

                                    <div className="mt-3">
                                        <label className="block text-xs font-bold text-slate-700 mb-1">Link New Project</label>
                                        <select
                                            onChange={(e) => handleLinkProject(client.id!, e.target.value ? parseInt(e.target.value) : undefined)}
                                            className="w-full p-2 text-sm border border-slate-300 rounded-lg bg-white text-black"
                                            value=""
                                        >
                                            <option value="">-- Select a project to link --</option>
                                            {projects?.filter(p => !p.clientAccountId || p.clientAccountId === client.id).map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} ({p.clientName})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 pt-4 border-t border-slate-200">
                                    <div className="text-xs text-slate-500">
                                        <span className="font-bold">Created:</span> {new Date(client.createdAt).toLocaleDateString()}
                                        {client.lastLogin && (
                                            <span className="ml-4">
                                                <span className="font-bold">Last Login:</span> {new Date(client.lastLogin).toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Client Account">
                <div className="space-y-4">
                    {/* Client Type Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3">Client Type</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="clientType"
                                    value="company"
                                    checked={formData.type === 'company'}
                                    onChange={(e) => setFormData({ ...formData, type: 'company' })}
                                    className="w-4 h-4"
                                />
                                <Building2 className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-slate-700">Company</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="clientType"
                                    value="individual"
                                    checked={formData.type === 'individual'}
                                    onChange={(e) => setFormData({ ...formData, type: 'individual' })}
                                    className="w-4 h-4"
                                />
                                <User className="w-4 h-4 text-blue-600" />
                                <span className="font-medium text-slate-700">Individual</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            {formData.type === 'company' ? 'Business Owner Name' : 'Full Name'}
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium"
                            placeholder={formData.type === 'company' ? 'John Doe' : 'Jane Smith'}
                        />
                    </div>

                    {formData.type === 'company' && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Company Name *</label>
                            <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium"
                                placeholder="ABC Corporation"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Email Address</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium"
                            placeholder="client@company.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium"
                            placeholder="Create a secure password"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            className="px-4 py-2 bg-black text-white rounded-lg font-bold hover:bg-neutral-800 transition"
                        >
                            Create Account
                        </button>
                    </div>
                </div>
            </Modal>
        </div >
    );
}
