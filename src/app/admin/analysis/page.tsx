'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Sparkles, Send, Bot, User, Lock } from 'lucide-react';

interface ChatMessage {
    role: 'user' | 'ai';
    content: string;
}

export default function AnalysisPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'ai', content: 'Hello! I am your Clinic Financial & Operations Data Analyst. I can help you analyze your *Inventory*, *Patient Feedback*, and *Financial Records*. What would you like to know?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Data Fetching
    const inventory = useLiveQuery(async () => {
        return await db.inventory.toArray();
    });

    const recentFeedback = useLiveQuery(async () => {
        // Fetch last 50 completed checkins with feedback
        return await db.checkins
            .where('status').equals('completed')
            .filter(c => c.feedbackRating !== undefined)
            .reverse()
            .limit(50)
            .toArray();
    });

    const invoices = useLiveQuery(async () => {
        return await db.invoices.toArray();
    });

    const projects = useLiveQuery(async () => {
        return await db.projects.toArray();
    });

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            // 1. Prepare Privacy-Safe Context
            const inventoryContext = inventory?.map(i => ({
                item: i.vaccineName,
                batch: i.batchNumber,
                stock: i.count,
                expiry: i.expiryDate,
                isLow: i.count <= i.minThreshold
            }));

            const feedbackContext = recentFeedback?.map(f => ({
                rating: f.feedbackRating,
                comment: f.feedbackComment || '(No comment)',
                // PRIVACY: Do NOT include name, ID, or phone
            }));

            const financialContext = invoices?.map(inv => ({
                invoiceNumber: inv.invoiceNumber,
                client: inv.clientName,
                amount: inv.amount,
                date: inv.date,
                projectId: inv.projectId
            }));

            const projectNames = projects?.reduce((acc: any, p) => {
                if (p.id) acc[p.id] = p.name;
                return acc;
            }, {});

            const contextData = {
                inventory: inventoryContext || [],
                feedback_sample: feedbackContext || [],
                total_feedback_count: feedbackContext?.length || 0,
                financials: financialContext || [],
                projects: projectNames || {}
            };

            // 2. Send to API
            const settings = await db.settings.get(1);
            const apiKey = settings?.openaiApiKey || '';

            const res = await fetch('/api/ai', {
                method: 'POST',
                body: JSON.stringify({
                    type: 'analysis',
                    prompt: `Context Data: ${JSON.stringify(contextData)}\n\nSystem Note: All monetary values are in Ringgit Malaysia (RM). Always use RM for currency.\n\nUser Question: ${userMessage}`
                }),
                headers: {
                    'Content-Type': 'application/json',
                    'x-openai-key': apiKey
                }
            });

            const json = await res.json();

            if (json.result) {
                setMessages(prev => [...prev, { role: 'ai', content: json.result }]);
            } else if (json.error) {
                setMessages(prev => [...prev, { role: 'ai', content: `Error: ${json.error}` }]);
            }

        } catch (e) {
            setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered a network error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)]">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-6 h-6 text-slate-400" />
                    Data Analyst
                </h1>
                <p className="text-slate-500 flex items-center gap-2 text-sm">
                    <Lock className="w-3 h-3" />
                    Privacy Safe: System uses anonymized data for analysis.
                </p>
            </div>

            {/* Chat Area */}
            <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((m, i) => (
                        <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-xl ${m.role === 'user'
                                ? 'bg-slate-900 text-white rounded-br-none'
                                : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm'
                                }`}>
                                <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] font-bold uppercase tracking-wider">
                                    {m.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                                    {m.role === 'user' ? 'Request' : 'Analysis Output'}
                                </div>
                                <div className="text-sm border-t border-white/10 pt-2 mt-1">{m.content}</div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white border border-slate-200 p-4 rounded-xl rounded-bl-none shadow-sm flex items-center gap-2 text-slate-500">
                                <Bot className="w-3 h-3" />
                                <span className="animate-pulse">Analyzing data...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                    <div className="flex gap-2">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Type a query (e.g. 'Show revenue by project' or 'Check low stock')..."
                            className="flex-1 p-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white text-black"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={isLoading || !input.trim()}
                            className="px-6 bg-slate-900 text-white rounded-lg hover:bg-black disabled:opacity-50 transition font-bold text-sm"
                        >
                            Process
                        </button>
                    </div>
                    <div className="mt-2 text-center text-xs text-slate-400">
                        AI can make mistakes. Verify important data manually.
                    </div>
                </div>
            </div>
        </div>
    );
}
