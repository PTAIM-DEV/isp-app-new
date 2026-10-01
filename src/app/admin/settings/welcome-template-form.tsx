'use client';

import { useState, useEffect } from 'react';
import { Save, MessageSquare } from 'lucide-react';
import { updateWelcomeTemplate } from './actions';

interface WelcomeTemplateFormProps {
    settingsMap: Record<string, string>;
}

export function WelcomeTemplateForm({ settingsMap }: WelcomeTemplateFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [welcomeWhatsapp, setWelcomeWhatsapp] = useState('');

    // Load template from settings
    useEffect(() => {
        setWelcomeWhatsapp(settingsMap['whatsapp_welcome_message'] || '');
    }, [settingsMap]);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await updateWelcomeTemplate({
                welcomeWhatsapp,
            });

            if (result.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setError(result.error || 'Gagal menyimpan template');
            }
        } catch (err) {
            setError('Terjadi kesalahan saat menyimpan template');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Template WhatsApp Welcome Message
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                    Template ini akan dikirim otomatis kepada pelanggan baru untuk memperkenalkan nomor WhatsApp resmi dan mencegah pelanggan memblokir nomor ini.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                    <strong>Variabel yang tersedia:</strong>
                </p>
                <ul className="text-sm text-gray-500 mb-4 list-disc list-inside">
                    <li><code>{'{{customerName}}'}</code> - Nama pelanggan</li>
                    <li><code>{'{{salesName}}'}</code> - Nama sales yang menangani pelanggan</li>
                    <li><code>{'{{salesPhone}}'}</code> atau <code>{'{{salesPhoneNumber}}'}</code> - Nomor telepon sales</li>
                    <li><code>{'{{packageName}}'}</code> - Nama paket langganan</li>
                    <li><code>{'{{companyName}}'}</code> - Nama perusahaan (opsional)</li>
                </ul>

                {success && (
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-800">Template berhasil disimpan!</p>
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <div className="mb-4">
                    <label htmlFor="welcomeWhatsapp" className="block text-sm font-medium text-gray-700 mb-2">
                        WhatsApp Template
                    </label>
                    <textarea
                        id="welcomeWhatsapp"
                        rows={20}
                        value={welcomeWhatsapp}
                        onChange={(e) => setWelcomeWhatsapp(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                        placeholder="Masukkan template WhatsApp welcome message..."
                    />
                    <p className="mt-2 text-sm text-gray-500">
                        Template default akan digunakan jika kosong.
                    </p>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    <Save className="-ml-1 mr-2 h-5 w-5" />
                    {isLoading ? 'Menyimpan...' : 'Simpan Template'}
                </button>
            </div>
        </form>
    );
}

