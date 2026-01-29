import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: Request) {
    try {
        const { prompt, type } = await request.json();
        const clientApiKey = request.headers.get('x-openai-key');

        // Use Client Key if provided, else fallback to env (which might be empty)
        const apiKey = clientApiKey || process.env.OPENAI_API_KEY;

        if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

        if (!apiKey) {
            // Mock Response for Demo without API Key
            await new Promise(r => setTimeout(r, 1000));
            return NextResponse.json({
                result: `[AI DEMO]: Feature is active but requires an API Key. Go to Admin -> Settings to enter your OpenAI Key.\n\nMOCK SUMMARY: Patient notes processed successfully.`
            });
        }

        const openai = new OpenAI({ apiKey });

        let systemPrompt = "You are a specialized medical assistant for a vaccination clinic. Be professional, clinical, and accurate.";

        if (type === 'notes') {
            systemPrompt = `You are a professional Medical Scribe. 
            TASK: Convert raw, rapid-fire doctor's consultation notes into clean, organized medical shorthand. 
            FORMAT: Use a structured bullet point format (similar to SOAP style if possible). 
            LANGUAGE: The input may be in English, Bahasa Malaysia, or Manglish. Maintain the professionalism in the output language that matches the predominant input.
            REDUCE: Remove filler words and keep it extremely dense but readable for other doctors.`;
        } else if (type === 'risk') {
            systemPrompt = `You are a Clinical Risk Assessment AI for a vaccination clinic. 
            TASK: Analyze the patient's Vital Signs (BP, Pulse) and Clinical Notes to determine if they are at risk for vaccination side effects or require closer observation.
            OUTPUT FORMAT:
            [RISK LEVEL]: (LOW, MEDIUM, or HIGH)
            [RATIONALE]: (1-2 sentences of clinical reasoning based on the data)
            [ACTION]: (e.g., Proceed, Observe for 30 mins, or Consult Senior Physician)
            
            GUIDELINES: 
            - High BP (>140/90) or high pulse (>100) should be flagged as MEDIUM/HIGH.
            - Severe allergies in notes should be flagged as HIGH.
            - Keep it clinical and sober.`;
        } else if (type === 'analysis') {
            systemPrompt = `You are a Senior Data Analyst for a vaccination clinic chain. 
            CONTEXT: You will receive JSON data covering Inventory (doses, batches, expiry), Feedback (ratings, comments), and Financials (invoices per project).
            TASK: Answer the user's operational question by synthesizing this data.
            PRIORITY: 
            1. Flag critical issues (Low stock, expiring batches soon, poor feedback ratings).
            2. Calculate totals/averages accurately as requested.
            3. Provide a brief actionable insight at the end of your analysis.
            STRICT PRIVACY: Never reveal specific patient identifiers if found. Focus on clinic-level trends and inventory health.`;
        }

        const completion = await openai.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            model: 'gpt-4o-mini', // Faster and better for reasoning than gpt-3.5-turbo
            temperature: 0.3, // Keep it grounded and factual
        });

        return NextResponse.json({ result: completion.choices[0].message.content });

    } catch (e: any) {
        console.error('AI Error', e);

        // Specific error handling for OpenAI common issues
        if (e.status === 401) {
            return NextResponse.json({ error: 'Your API Key is invalid. Please check Admin -> Settings.' }, { status: 401 });
        }
        if (e.status === 429) {
            return NextResponse.json({ error: 'OpenAI Rate Limit exceeded. Please check your credit balance.' }, { status: 429 });
        }

        return NextResponse.json({ error: 'Service Unavailable: ' + (e.message || 'Unknown error') }, { status: 500 });
    }
}
