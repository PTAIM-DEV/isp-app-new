'use client';
import { useState } from 'react';
import { Save, Loader2, Bot, User, Shield, Sparkles, Send } from 'lucide-react';

interface PersonaTabProps {
    initialPromptAdmin: string;
    initialPromptCustomer: string;
    onSave: (promptAdmin: string, promptCustomer: string) => Promise<void>;
}

export default function PersonaTab({ initialPromptAdmin, initialPromptCustomer, onSave }: PersonaTabProps) {
    const [promptAdmin, setPromptAdmin] = useState(initialPromptAdmin);
    const [promptCustomer, setPromptCustomer] = useState(initialPromptCustomer);
    const [activeTab, setActiveTab] = useState<'customer' | 'admin'>('customer');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // AI Assistant State
    const [showAiAssist, setShowAiAssist] = useState(false);
    const [aiInstruction, setAiInstruction] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    const handleGeneratePrompt = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!aiInstruction.trim()) return;

        setAiLoading(true);
        try {
            const currentPrompt = activeTab === 'customer' ? promptCustomer : promptAdmin;

            const res = await fetch('/api/admin/ai/generate-prompt', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPrompt, instruction: aiInstruction }),
            });

            const data = await res.json();

            if (data.prompt) {
                if (activeTab === 'customer') {
                    setPromptCustomer(data.prompt);
                } else {
                    setPromptAdmin(data.prompt);
                }
                setAiInstruction('');
                setShowAiAssist(false);
                setMessage({ type: 'success', text: 'Prompt updated by AI. Don\'t forget to Save!' });
            } else {
                setMessage({ type: 'error', text: data.error || 'Failed to generate prompt' });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'AI Generation Failed' });
        } finally {
            setAiLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await onSave(promptAdmin, promptCustomer);
            setMessage({ type: 'success', text: 'Persona settings saved successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
                <Bot className="w-5 h-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Bot Persona</h2>
                <div className="ml-auto">
                    <button
                        type="button"
                        onClick={() => setShowAiAssist(!showAiAssist)}
                        className="inline-flex items-center px-3 py-1.5 border border-purple-200 text-sm font-medium rounded-full text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors"
                    >
                        <Sparkles className="w-4 h-4 mr-1.5" />
                        AI Assist
                    </button>
                </div>
            </div>
            <p className="text-sm text-gray-500 mb-6">
                Define the persona and system prompt for the AI bot. These instructions will guide how the bot behaves and responds for different user roles.
            </p>

            {showAiAssist && (
                <div className="mb-6 bg-purple-50 rounded-lg p-4 border border-purple-100">
                    <h3 className="text-sm font-semibold text-purple-900 mb-2 flex items-center">
                        <Sparkles className="w-4 h-4 mr-2" />
                        AI Prompt Engineer
                    </h3>
                    <p className="text-xs text-purple-700 mb-3">
                        Describe how you want to change the prompt (e.g., "Make it more polite", "Add a rule to ask for Location").
                        The AI will rewrite the current <strong>{activeTab === 'customer' ? 'Customer' : 'Admin'}</strong> persona for you.
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={aiInstruction}
                            onChange={(e) => setAiInstruction(e.target.value)}
                            placeholder="e.g., Change tone to professional and strict..."
                            className="flex-1 px-3 py-2 border border-purple-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                            onKeyDown={(e) => e.key === 'Enter' && handleGeneratePrompt(e)}
                        />
                        <button
                            type="button"
                            onClick={handleGeneratePrompt}
                            disabled={aiLoading || !aiInstruction.trim()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                        >
                            {aiLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="w-4 h-4 mr-2" />
                                    Generate
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            type="button"
                            onClick={() => setActiveTab('customer')}
                            className={`${activeTab === 'customer'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                            <User className="w-4 h-4 mr-2" />
                            Customer Persona
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('admin')}
                            className={`${activeTab === 'admin'
                                ? 'border-green-500 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                        >
                            <Shield className="w-4 h-4 mr-2" />
                            Admin Persona
                        </button>
                    </nav>
                </div>

                <div className="mt-4">
                    {activeTab === 'customer' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Customer System Prompt
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Rules for interacting with regular customers (Escalation logic, strict boundaries).
                            </p>
                            <textarea
                                rows={16}
                                value={promptCustomer}
                                onChange={(e) => setPromptCustomer(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                                placeholder="You are a helpful assistant..."
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Admin System Prompt
                            </label>
                            <p className="text-xs text-gray-500 mb-2">
                                Rules for interacting with Admins (Tool access, database queries).
                            </p>
                            <textarea
                                rows={16}
                                value={promptAdmin}
                                onChange={(e) => setPromptAdmin(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                                placeholder="You are an admin assistant..."
                            />
                        </div>
                    )}
                </div>

                {message && (
                    <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}
                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Personas
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
