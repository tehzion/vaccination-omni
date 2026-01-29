import React from 'react';

export default function OfflinePage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-white p-4 text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">You are Offline</h1>
            <p className="text-slate-500">Please check your internet connection.</p>
        </div>
    );
}
