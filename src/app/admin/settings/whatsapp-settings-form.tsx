'use client';

import { useState } from 'react';
import { Trash2, Plus, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Template {
    id: string;
    content: string;
    isActive: boolean;
}

interface WhatsAppSettingsProps {
    minInterval: number;
    randomInterval: number;
    templates: Template[];
}

export default function WhatsAppSettingsClient({ minInterval, randomInterval, templates: initialTemplates }: WhatsAppSettingsProps) {
    const router = useRouter();
    const [settings, setSettings] = useState({
        minInterval,
        randomInterval
    });
    const [templates, setTemplates] = useState<Template[]>(initialTemplates);
    const [isSaving, setIsSaving] = useState(false);

    const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: parseInt(value) || 0
        }));
    };

    const addTemplate = () => {
        const newTemplate: Template = {
            id: `new-${Date.now()}`,
            content: '',
            isActive: true
        };
        setTemplates([...templates, newTemplate]);
    };

    const updateTemplate = (id: string, content: string) => {
        setTemplates(templates.map(t =>
            t.id === id ? { ...t, content } : t
        ));
    };

    const toggleTemplate = (id: string) => {
        setTemplates(templates.map(t =>
            t.id === id ? { ...t, isActive: !t.isActive } : t
        ));
    };

    const removeTemplate = (id: string) => {
        setTemplates(templates.filter(t => t.id !== id));
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            const response = await fetch('/api/admin/settings/whatsapp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    settings,
                    templates
                })
            });

            if (!response.ok) throw new Error('Failed to save');

            alert('Settings saved successfully!');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Rate Limiting Section */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Anti-Ban Rate Limiting</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Minimum Interval (ms)
                        </label>
                        <input
                            type="number"
                            name="minInterval"
                            value={settings.minInterval}
                            onChange={handleSettingChange}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="5000"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Waktu tunggu minimal antar pesan (default: 5000ms)
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Random Jitter Max (ms)
                        </label>
                        <input
                            type="number"
                            name="randomInterval"
                            value={settings.randomInterval}
                            onChange={handleSettingChange}
                            className="w-full px-3 py-2 border rounded-md"
                            placeholder="5000"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Tambahan waktu acak (default: 5000ms). Total delay = Min + Random(0-Max).
                        </p>
                    </div>
                </div>
            </div>

            {/* Templates Section */}
            <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium">Welcome Message Templates</h3>
                    <button
                        onClick={addTemplate}
                        className="flex items-center px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100"
                    >
                        <Plus className="h-4 w-4 mr-1" /> Add Template
                    </button>
                </div>

                <div className="space-y-4">
                    {templates.map((template, index) => (
                        <div key={template.id} className="border rounded-md p-4 relative bg-gray-50">
                            <div className="flex items-start gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-semibold text-gray-500 mb-1 block">
                                        Template {index + 1}
                                        {template.id.startsWith('new') && <span className="text-amber-500 ml-2">(Draft)</span>}
                                    </label>
                                    <textarea
                                        value={template.content}
                                        onChange={(e) => updateTemplate(template.id, e.target.value)}
                                        className="w-full p-2 text-sm border rounded-md min-h-[80px]"
                                        placeholder="Halo {name}, selamat datang..."
                                    />
                                    <p className="text-xs text-gray-400 mt-1">
                                        Vars: {'{{customerName}}, {{salesName}}, {{salesPhoneNumber}}, {{packageName}}, {Spintax|Supported}'}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2 pt-6">
                                    <label className="flex items-center cursor-pointer text-sm">
                                        <input
                                            type="checkbox"
                                            checked={template.isActive}
                                            onChange={() => toggleTemplate(template.id)}
                                            className="mr-2"
                                        />
                                        Active
                                    </label>
                                    <button
                                        onClick={() => removeTemplate(template.id)}
                                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        title="Delete"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {templates.length === 0 && (
                        <p className="text-center text-gray-500 text-sm py-4">
                            Belum ada template. Tambahkan satu untuk memulai.
                        </p>
                    )}
                </div>
            </div>

            <div className="flex justify-end sticky bottom-6 z-10">
                <button
                    onClick={saveSettings}
                    disabled={isSaving}
                    className="flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 disabled:opacity-50"
                >
                    <Save className="h-5 w-5 mr-2" />
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
