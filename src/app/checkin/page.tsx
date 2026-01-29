'use client';

import React, { Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { db } from '@/lib/db';
import { generateUUID, generateQueueNumber } from '@/lib/utils';
import { Globe, LogIn, ArrowRight, Briefcase } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

interface CheckInForm {
    fullName: string;
    mykad: string;
    phone: string;
    email: string;
}

function CheckInContent() {
    const { t, language, setLanguage } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = searchParams.get('projectId') ? Number(searchParams.get('projectId')) : undefined;
    const queryFullName = searchParams.get('fullName') || '';
    const queryMykad = searchParams.get('mykad') || '';
    const { addToast } = useToast();

    const { register, handleSubmit, formState: { errors, isSubmitting }, setValue } = useForm<CheckInForm>({
        defaultValues: {
            fullName: queryFullName,
            mykad: queryMykad,
        }
    });

    // Handle updates if query params change after mount
    React.useEffect(() => {
        if (queryFullName) setValue('fullName', queryFullName);
        if (queryMykad) setValue('mykad', queryMykad);
    }, [queryFullName, queryMykad, setValue]);

    const project = useLiveQuery(async () => {
        if (!projectId) return undefined;
        return await db.projects.get(projectId);
    }, [projectId]);

    const onSubmit = async (data: CheckInForm) => {
        try {
            // Create Queue Number
            const count = await db.checkins
                .where('timestamp')
                .above(new Date().setHours(0, 0, 0, 0))
                .count();

            const queueNumber = generateQueueNumber(count + 1);
            const id = generateUUID();

            await db.checkins.add({
                id,
                fullName: data.fullName,
                mykad: data.mykad,
                phone: data.phone,
                email: data.email,
                queueNumber,
                status: 'waiting',
                projectId: projectId, // Link to project if present
                language: language,
                dose: 1, // Default to Dose 1 for public check-in
                timestamp: Date.now()
            });

            // Redirect to success
            router.push(`/checkin/success?q=${queueNumber}&id=${id}`);
        } catch (e) {
            console.error(e);
            addToast('Error submitting form. Please try again.', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">

            {/* Minimal Header */}
            <div className="p-6 flex justify-between items-center bg-white sticky top-0 z-10">
                <h1 className="text-xl font-bold tracking-tight">Vaccine<span className="font-normal text-gray-500">Manager</span></h1>
                <button
                    onClick={() => setLanguage(language === 'en' ? 'bm' : 'en')}
                    className="flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-sm font-medium transition-colors"
                >
                    <Globe className="w-4 h-4" />
                    {language.toUpperCase()}
                </button>
            </div>

            <div className="flex-1 flex flex-col justify-center p-6 pb-20 max-w-lg mx-auto w-full">

                <div className="mb-8 space-y-2">
                    <h2 className="text-4xl font-bold tracking-tight text-black">{t.checkInTitle}</h2>
                    <p className="text-lg text-gray-500">{t.checkInSubtitle}</p>
                    {project && (
                        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center gap-3 text-slate-800">
                            <Briefcase className="w-5 h-5 flex-shrink-0 text-slate-500" />
                            <div>
                                <p className="text-[10px] font-bold uppercase opacity-50 tracking-wider">Dedicated Check-in For</p>
                                <p className="font-bold">{project.name}</p>
                                <p className="text-xs opacity-70">{project.clientName}</p>
                            </div>
                        </div>
                    )}
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                    <div className="space-y-4">
                        <div className="space-y-1">
                            {/* Uber Style Input: Gray background, no border, large text */}
                            <input
                                {...register('fullName', { required: true })}
                                className="w-full bg-white text-black border border-gray-200 text-lg px-4 py-4 rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-black outline-none transition-all"
                                placeholder={t.fullName}
                            />
                            {errors.fullName && <span className="text-red-500 text-sm ml-2">{t.required}</span>}
                        </div>

                        <div className="space-y-1">
                            <input
                                {...register('mykad', { required: true })}
                                className="w-full bg-white text-black border border-gray-200 text-lg px-4 py-4 rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-black outline-none transition-all"
                                placeholder={t.icNumber}
                            />
                            {errors.mykad && <span className="text-red-500 text-sm ml-2">{t.required}</span>}
                        </div>

                        <div className="space-y-1">
                            <input
                                {...register('phone')}
                                type="tel"
                                className="w-full bg-white text-black border border-gray-200 text-lg px-4 py-4 rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-black outline-none transition-all"
                                placeholder={t.phone}
                            />
                        </div>

                        <div className="space-y-1">
                            <input
                                {...register('email')}
                                type="email"
                                className="w-full bg-white text-black border border-gray-200 text-lg px-4 py-4 rounded-xl placeholder:text-gray-400 focus:ring-2 focus:ring-black outline-none transition-all"
                                placeholder="Email (for Certificate)"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-black text-white text-xl font-bold py-4 rounded-xl hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex justify-center items-center gap-2"
                    >
                        {isSubmitting ? '...' : (
                            <>
                                {t.submit}
                                <ArrowRight className="w-6 h-6" />
                            </>
                        )}
                    </button>

                </form>
            </div>

            <div className="p-6 text-center text-gray-400 text-sm pb-10">
                <p>{t.secureFooter}</p>
            </div>

            <div className="fixed top-0 right-0 p-4 opacity-0 hover:opacity-100 transition-opacity">
                <button onClick={() => router.push('/admin/login')} className="p-2 text-gray-300 hover:text-black">
                    <LogIn className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}

export default function CheckInPage() {
    return (
        <Suspense fallback={<div className="p-6">Loading Check-in...</div>}>
            <CheckInContent />
        </Suspense>
    );
}
