// Simulate Server-Side DB for certificates (For Verification)
// In a Vercel serverless environment, the filesystem is READ-ONLY.
// We cannot use fs.writeFile. 
// For this demo, we will use an in-memory store. 
// NOTE: Data will RESET when the serverless function spins down (cold start).
// For production, use Vercel KV, Postgres, or MongoDB.

import { NextResponse } from 'next/server';

// Global in-memory store
const certStore = new Map<string, any>();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, ...data } = body;

        if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

        // Save to memory
        certStore.set(id, { ...data, createdAt: new Date().toISOString() });

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('Cert Save Error', e);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
        const cert = certStore.get(id);
        if (!cert) return NextResponse.json({ error: 'Not Found' }, { status: 404 });
        return NextResponse.json(cert);
    }

    return NextResponse.json({ error: 'ID required' }, { status: 400 });
}
