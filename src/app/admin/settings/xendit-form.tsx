'use client';

import { useState } from 'react';
import { saveSettings } from './actions';
import { Loader2 } from 'lucide-react';

export function XenditSettingsForm({ initialSettings }: { initialSettings: Record<string, string> }) {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setMessage('');

        const result = await saveSettings(formData);

        setIsLoading(false);
        if (result.success) {
            setMessage('Pengaturan berhasil disimpan.');
        } else {
            setMessage('Gagal menyimpan: ' + result.error);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            {message && (
                <div className={`p-4 rounded-md ${message.includes('Gagal') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700">Admin Fee (IDR)</label>
                <p className="text-xs text-gray-500 mb-1">Biaya admin yang ditambahkan ke invoice Xendit.</p>
                <input
                    type="number"
                    name="xendit_admin_fee"
                    defaultValue={initialSettings['xendit_admin_fee'] || '5000'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Menyimpan...
                    </>
                ) : (
                    'Simpan Pengaturan'
                )}
            </button>
        </form>
    );
}
