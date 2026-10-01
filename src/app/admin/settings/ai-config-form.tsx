'use client';

import { useState, useEffect } from 'react';
import { updateAIConfig, getAIConfig, getTokenUsageStats } from './ai-actions';
import { Save, RefreshCw, Cpu, MessageSquare, DollarSign } from 'lucide-react';

export default function AIConfigForm() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [config, setConfig] = useState({ apiKey: '', systemPrompt: '' });
    const [stats, setStats] = useState<any>(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        try {
            const [conf, usage] = await Promise.all([
                getAIConfig(),
                getTokenUsageStats()
            ]);
            setConfig(conf);
            setStats(usage);
        } catch (error) {
            console.error('Failed to load AI data', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setSaving(true);
        const formData = new FormData(e.currentTarget);
        const result = await updateAIConfig(formData);
        setSaving(false);

        if (result.success) {
            alert('Settings saved successfully!');
        } else {
            alert('Failed to save settings: ' + (result.error || 'Unknown error'));
        }
    }

    if (loading) return <div>Loading AI settings...</div>;

    // Calculate estimated cost (approx $0.01 per 1k tokens for GPT-4 Turbo mixed input/output)
    // This is a rough estimate.
    const totalTokens = stats?.total?.totalTokens || 0;
    const estimatedCost = (totalTokens / 1000) * 0.01;

    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg shadow border border-indigo-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Tokens Used</p>
                            <p className="text-2xl font-bold text-indigo-600">{totalTokens.toLocaleString()}</p>
                        </div>
                        <Cpu className="h-8 w-8 text-indigo-200" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-green-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Est. Cost (USD)</p>
                            <p className="text-2xl font-bold text-green-600">${estimatedCost.toFixed(4)}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-green-200" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border border-blue-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Recent Requests</p>
                            <p className="text-2xl font-bold text-blue-600">{stats?.recent?.length || 0}</p>
                        </div>
                        <MessageSquare className="h-8 w-8 text-blue-200" />
                    </div>
                </div>
            </div>

            {/* Configuration Form */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Configuration</h3>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">OpenAI API Key</label>
                        <input
                            type="password"
                            name="apiKey"
                            defaultValue={config.apiKey}
                            placeholder="sk-..."
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                        />
                        <p className="mt-1 text-xs text-gray-500">Key is stored securely in database.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">System Prompt</label>
                        <textarea
                            name="systemPrompt"
                            rows={10}
                            defaultValue={config.systemPrompt}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border font-mono"
                            placeholder="You are a helpful assistant..."
                        />
                        <p className="mt-1 text-xs text-gray-500">Define the AI's personality and knowledge base here.</p>
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Save Configuration
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
