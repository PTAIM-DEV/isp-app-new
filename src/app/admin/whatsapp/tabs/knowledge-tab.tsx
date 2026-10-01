'use client';
import { useState } from 'react';
import { Save, Loader2, BookOpen } from 'lucide-react';

interface KnowledgeTabProps {
    initialKnowledge: string;
    onSave: (knowledge: string) => Promise<void>;
}

export default function KnowledgeTab({ initialKnowledge, onSave }: KnowledgeTabProps) {
    const [knowledge, setKnowledge] = useState(initialKnowledge);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);
        try {
            await onSave(knowledge);
            setMessage({ type: 'success', text: 'Knowledge base saved successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
                <BookOpen className="w-5 h-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Knowledge Base (RAG)</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">
                Provide text content that serves as the knowledge base for the bot. The bot will use this context to answer questions.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Knowledge Content
                    </label>
                    <textarea
                        rows={12}
                        value={knowledge}
                        onChange={(e) => setKnowledge(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 font-mono text-sm"
                        placeholder="Paste your knowledge base text here..."
                    />
                </div>
                {message && (
                    <div className={`p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {message.text}
                    </div>
                )}
                <div className="flex justify-end">
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
                                Save Knowledge
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
