'use client';

import { useState } from 'react';
import { saveTerms } from './actions';
import { Loader2 } from 'lucide-react';

export function TermsForm({ initialContent }: { initialContent: string }) {
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setMessage('');

        const result = await saveTerms(formData);

        setIsLoading(false);
        if (result.success) {
            setMessage('Syarat & Ketentuan berhasil disimpan.');
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Konten Syarat & Ketentuan</label>
                <p className="text-xs text-gray-500 mb-2">Anda dapat menggunakan format Markdown sederhana.</p>
                <textarea
                    name="terms_content"
                    defaultValue={initialContent}
                    rows={15}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-mono"
                    placeholder="Masukkan syarat dan ketentuan layanan di sini..."
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
                    'Simpan S&K'
                )}
            </button>
        </form>
    );
}
