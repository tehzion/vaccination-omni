'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { ArrowLeft, CheckCircle, Star } from 'lucide-react';
import { db } from '@/lib/db';
import Link from 'next/link';

function SuccessContent() {
    const { t } = useLanguage();
    const router = useRouter();
    const searchParams = useSearchParams();
    const queueNumber = searchParams.get('q');
    const checkinId = searchParams.get('id');
    const [timeLeft, setTimeLeft] = useState(15);
    const [rating, setRating] = useState(0);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    router.push('/checkin');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [router]);

    return (
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 text-center space-y-8 animate-in fade-in zoom-in duration-300">
            <div className="flex justify-center">
                <CheckCircle className="w-24 h-24 text-green-500" />
            </div>

            <div className="space-y-2">
                <h1 className="text-3xl font-bold text-slate-900">{t.success}</h1>
                <p className="text-slate-500 text-lg">{t.pleaseWait}</p>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <p className="text-sm font-medium text-blue-600 uppercase tracking-wider mb-2">{t.queueNumber}</p>
                <p className="text-6xl font-black text-blue-700 tracking-tight">{queueNumber || '---'}</p>
            </div>

            {/* Feedback Section */}
            {!submitted ? (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <h3 className="text-sm font-bold text-slate-600 mb-3">How was your registration?</h3>
                    <div className="flex justify-center gap-2 mb-4">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onClick={() => setRating(star)}
                                className={`w-10 h-10 flex items-center justify-center rounded-full transition ${rating >= star ? 'bg-yellow-100 text-yellow-500' : 'bg-white text-slate-300'
                                    } hover:scale-110`}
                            >
                                <Star fill={rating >= star ? "currentColor" : "none"} className="w-6 h-6" />
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={async () => {
                            try {
                                if (checkinId) {
                                    await db.checkins.update(checkinId, {
                                        feedbackRating: rating,
                                        feedbackComment: 'Patient provided rating after check-in'
                                    });
                                } else {
                                    // Fallback if ID is missing (shouldn't happen with new logic)
                                    const latest = await db.checkins.orderBy('timestamp').reverse().first();
                                    if (latest && latest.queueNumber === queueNumber) {
                                        await db.checkins.update(latest.id, {
                                            feedbackRating: rating,
                                            feedbackComment: 'Patient provided rating after check-in'
                                        });
                                    }
                                }
                                setSubmitted(true);
                                setTimeLeft(5);
                            } catch (e) {
                                console.error('Feedback save error', e);
                                setSubmitted(true);
                            }
                        }}
                        disabled={rating === 0}
                        className="w-full py-2 bg-black text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-800 transition"
                    >
                        Submit Feedback
                    </button>
                </div>
            ) : (
                <div className="bg-green-50 p-6 rounded-xl border border-green-100">
                    <p className="text-green-800 font-bold">Thank you for your feedback!</p>
                </div>
            )}

            <div className="pt-4 flex flex-col items-center gap-2">
                <Link
                    href="/checkin"
                    className="inline-flex items-center text-slate-500 hover:text-blue-600 font-medium transition"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    {t.back}
                </Link>
                <p className="text-xs text-slate-400">Autoredirect in {timeLeft}s...</p>
            </div>
        </div>
    );
}

export default function CheckInSuccessPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-green-50 p-4">
            <Suspense fallback={<div>Loading...</div>}>
                <SuccessContent />
            </Suspense>
        </div>
    );
}
