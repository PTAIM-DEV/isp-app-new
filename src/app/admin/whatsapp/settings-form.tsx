'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Clock, Bot, Variable, BookOpen, Settings, Link as LinkIcon } from 'lucide-react';
import PersonaTab from './tabs/persona-tab';
import VariablesTab from './tabs/variables-tab';
import KnowledgeTab from './tabs/knowledge-tab';
import WhatsAppConnection from './whatsapp-status';

export default function SettingsForm() {
    const [activeTab, setActiveTab] = useState<'connection' | 'general' | 'persona' | 'variables' | 'knowledge'>('connection');

    // General Settings
    const [minDelay, setMinDelay] = useState<number>(60);
    const [maxDelay, setMaxDelay] = useState<number>(180);
    const [aiReplyEnabled, setAiReplyEnabled] = useState<boolean>(true);

    // New Settings
    const [systemPromptAdmin, setSystemPromptAdmin] = useState<string>('');
    const [systemPromptCustomer, setSystemPromptCustomer] = useState<string>('');
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [ragKnowledge, setRagKnowledge] = useState<string>('');

    const [loading, setLoading] = useState(false);
    const [fetched, setFetched] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings/whatsapp');
            const data = await res.json();
            if (data.minDelay) setMinDelay(data.minDelay);
            if (data.maxDelay) setMaxDelay(data.maxDelay);
            if (data.aiReplyEnabled !== undefined) setAiReplyEnabled(data.aiReplyEnabled);
            if (data.variables) setVariables(data.variables);
            if (data.ragKnowledge) setRagKnowledge(data.ragKnowledge);
            if (data.systemPromptAdmin) setSystemPromptAdmin(data.systemPromptAdmin);
            if (data.systemPromptCustomer) setSystemPromptCustomer(data.systemPromptCustomer);
            setFetched(true);
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        }
    };

    const handleSaveGeneral = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            if (minDelay > maxDelay) {
                setMessage({ type: 'error', text: 'Min Delay cannot be greater than Max Delay' });
                setLoading(false);
                return;
            }

            const res = await fetch('/api/settings/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ minDelay, maxDelay, aiReplyEnabled }),
            });

            if (res.ok) {
                setMessage({ type: 'success', text: 'General settings saved successfully' });
            } else {
                setMessage({ type: 'error', text: 'Failed to save settings' });
            }
        } catch (error) {
            setMessage({ type: 'error', text: 'An error occurred' });
        } finally {
            setLoading(false);
        }
    };

    const savePersona = async (promptAdmin: string, promptCustomer: string) => {
        await fetch('/api/settings/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPromptAdmin: promptAdmin, systemPromptCustomer: promptCustomer }),
        });
        setSystemPromptAdmin(promptAdmin);
        setSystemPromptCustomer(promptCustomer);
    };

    const saveVariables = async (vars: Record<string, string>) => {
        await fetch('/api/settings/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variables: vars }),
        });
        setVariables(vars); // Update local state
    };

    const saveKnowledge = async (knowledge: string) => {
        await fetch('/api/settings/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ragKnowledge: knowledge }),
        });
        setRagKnowledge(knowledge); // Update local state
    };

    if (!fetched) {
        return <div className="p-4 text-center text-gray-500">Loading settings...</div>;
    }

    const tabs = [
        { id: 'connection', label: 'Connection', icon: LinkIcon },
        { id: 'general', label: 'General', icon: Settings },
        { id: 'persona', label: 'Persona', icon: Bot },
        { id: 'variables', label: 'Variables', icon: Variable },
        { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    ] as const;

    return (
        <div className="mb-6">
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                ${activeTab === tab.id
                                    ? 'border-green-500 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }
                                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                            `}
                        >
                            <tab.icon
                                className={`
                                    ${activeTab === tab.id ? 'text-green-500' : 'text-gray-400 group-hover:text-gray-500'}
                                    -ml-0.5 mr-2 h-5 w-5
                                `}
                            />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'connection' && (
                <WhatsAppConnection />
            )}

            {activeTab === 'general' && (
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center mb-4">
                        <Clock className="w-5 h-5 text-gray-500 mr-2" />
                        <h2 className="text-lg font-medium text-gray-900">General Configuration</h2>
                    </div>

                    <form onSubmit={handleSaveGeneral} className="space-y-6">
                        {/* AI Auto-Reply Toggle */}
                        <div className="flex items-center justify-between py-4 border-b border-gray-100">
                            <div>
                                <h3 className="text-sm font-medium text-gray-900">AI Auto-Reply</h3>
                                <p className="text-sm text-gray-500">Enable or disable the AI responding to messages automatically.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAiReplyEnabled(!aiReplyEnabled)}
                                className={`${aiReplyEnabled ? 'bg-green-600' : 'bg-gray-200'
                                    } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2`}
                            >
                                <span
                                    className={`${aiReplyEnabled ? 'translate-x-5' : 'translate-x-0'
                                        } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                />
                            </button>
                        </div>

                        {/* Delay Settings */}
                        <div>
                            <h3 className="text-sm font-medium text-gray-900 mb-4">Message Delay Configuration</h3>
                            <p className="text-sm text-gray-500 mb-4">
                                Set the random delay range between outgoing messages to prevent spam detection.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Min Delay (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={minDelay}
                                        onChange={(e) => setMinDelay(parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Max Delay (seconds)
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={maxDelay}
                                        onChange={(e) => setMaxDelay(parseInt(e.target.value) || 0)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        required
                                    />
                                </div>
                            </div>
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
                                        Save Settings
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'persona' && (
                <PersonaTab
                    initialPromptAdmin={systemPromptAdmin}
                    initialPromptCustomer={systemPromptCustomer}
                    onSave={savePersona}
                />
            )}

            {activeTab === 'variables' && (
                <VariablesTab initialVariables={variables} onSave={saveVariables} />
            )}

            {activeTab === 'knowledge' && (
                <KnowledgeTab initialKnowledge={ragKnowledge} onSave={saveKnowledge} />
            )}

        </div>
    );
}
