'use client';
import { useState } from 'react';
import { Save, Loader2, Variable, Plus, Trash2 } from 'lucide-react';

interface VariablesTabProps {
    initialVariables: Record<string, string>;
    onSave: (variables: Record<string, string>) => Promise<void>;
}

export default function VariablesTab({ initialVariables, onSave }: VariablesTabProps) {
    const [variables, setVariables] = useState<{ key: string; value: string }[]>(
        Object.entries(initialVariables).map(([key, value]) => ({ key, value }))
    );
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const addVariable = () => {
        setVariables([...variables, { key: '', value: '' }]);
    };

    const removeVariable = (index: number) => {
        const newVars = [...variables];
        newVars.splice(index, 1);
        setVariables(newVars);
    };

    const updateVariable = (index: number, field: 'key' | 'value', val: string) => {
        const newVars = [...variables];
        newVars[index][field] = val;
        setVariables(newVars);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const varObject: Record<string, string> = {};
        variables.forEach(v => {
            if (v.key.trim()) {
                varObject[v.key.trim()] = v.value;
            }
        });

        try {
            await onSave(varObject);
            setMessage({ type: 'success', text: 'Variables saved successfully' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to save settings' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
                <Variable className="w-5 h-5 text-gray-500 mr-2" />
                <h2 className="text-lg font-medium text-gray-900">Variables</h2>
            </div>
            <p className="text-sm text-gray-500 mb-6">
                Define dynamic variables that can be used in the persona prompt or responses.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
                {variables.map((variable, index) => (
                    <div key={index} className="flex gap-4 items-start">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={variable.key}
                                onChange={(e) => updateVariable(index, 'key', e.target.value)}
                                placeholder="Key (e.g., COMPANY_NAME)"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            />
                        </div>
                        <div className="flex-[2]">
                            <input
                                type="text"
                                value={variable.value}
                                onChange={(e) => updateVariable(index, 'value', e.target.value)}
                                placeholder="Value"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => removeVariable(index)}
                            className="p-2 text-red-600 hover:text-red-800"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ))}

                <button
                    type="button"
                    onClick={addVariable}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Variable
                </button>

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
                                Save Variables
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
