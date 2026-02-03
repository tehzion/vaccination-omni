'use client';

import React, { useState } from 'react';
import { useClientAuth } from '@/contexts/ClientAuthContext';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/db';
import { Calendar, MapPin, Users, Building2, ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';

export default function RequestBookingPage() {
    const { client, isAuthenticated, isLoading } = useClientAuth();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        location: '',
        requestedDate: '',
        estimatedPatients: '',
        contactPerson: client?.name || '',
        contactEmail: client?.email || '',
    });

    React.useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/client');
        }
        if (client) {
            setFormData(prev => ({
                ...prev,
                contactPerson: client.name,
                contactEmail: client.email
            }));
        }
    }, [isAuthenticated, isLoading, router, client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            await db.projects.add({
                name: formData.name,
                clientName: client?.company || '',
                invoiceAddress: '',
                contactPerson: formData.contactPerson,
                contactEmail: formData.contactEmail,
                status: 'pending_approval',
                timestamp: Date.now(),
                startDate: formData.requestedDate,
                estimatedPatients: parseInt(formData.estimatedPatients) || undefined,
                clientAccountId: client?.id
            });

            alert('Booking request submitted successfully! Our team will review and contact you shortly.');
            router.push('/client/dashboard');
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Failed to submit request. Please try again.');
            setIsSubmitting(false);
        }
    };

    if (isLoading || !client) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/client/dashboard"
                            className="p-2 hover:bg-slate-100 rounded-lg transition"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Request New Booking</h1>
                            <p className="text-sm text-slate-500">Submit a vaccination drive request for your organization</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Event/Drive Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium focus:ring-2 focus:ring-black outline-none"
                                placeholder="e.g., Annual Health Screening 2024"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Requested Date *
                            </label>
                            <input
                                type="date"
                                value={formData.requestedDate}
                                onChange={(e) => setFormData({ ...formData, requestedDate: e.target.value })}
                                required
                                className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                Estimated Participants *
                            </label>
                            <input
                                type="number"
                                value={formData.estimatedPatients}
                                onChange={(e) => setFormData({ ...formData, estimatedPatients: e.target.value })}
                                required
                                min="1"
                                className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium focus:ring-2 focus:ring-black outline-none"
                                placeholder="50"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                Location *
                            </label>
                            <input
                                type="text"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                required
                                className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium focus:ring-2 focus:ring-black outline-none"
                                placeholder="e.g., Company Office, Kuala Lumpur"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Contact Person
                            </label>
                            <input
                                type="text"
                                value={formData.contactPerson}
                                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Contact Email
                            </label>
                            <input
                                type="email"
                                value={formData.contactEmail}
                                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                className="w-full p-3 border border-slate-300 rounded-lg bg-white text-black font-medium focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div className="flex items-start gap-3">
                            <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-bold text-slate-900">{client.company}</p>
                                <p className="text-xs text-slate-500 mt-1">
                                    This request will be submitted on behalf of your organization. Our team will review and contact you within 24-48 hours.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <Link
                            href="/client/dashboard"
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold transition"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-lg font-bold hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Submitting...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Submit Request
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
