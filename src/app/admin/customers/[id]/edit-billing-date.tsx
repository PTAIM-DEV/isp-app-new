'use client';

import { useState } from 'react';
import { Loader2, Calendar, X } from 'lucide-react';
import { updateNextBillingDate } from '../actions';

interface EditBillingDateProps {
    userId: string;
    currentDate: Date | null;
    onSuccess?: () => void;
}

export function EditBillingDate({ userId, currentDate, onSuccess }: EditBillingDateProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [billingDate, setBillingDate] = useState(
        currentDate ? new Date(currentDate).toISOString().split('T')[0] : ''
    );

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (!billingDate) {
            setError('Tanggal tagihan harus diisi');
            setIsLoading(false);
            return;
        }

        const result = await updateNextBillingDate(userId, billingDate);
        setIsLoading(false);

        if (result.success) {
            setIsOpen(false);
            if (onSuccess) onSuccess();
            window.location.reload();
        } else {
            setError(result.error || 'Gagal mengupdate tanggal tagihan');
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-900 border border-indigo-300 rounded hover:bg-indigo-50"
                title="Edit tanggal tagihan berikutnya"
            >
                <Calendar className="h-3 w-3 mr-1" />
                {currentDate ? 'Edit' : 'Set'}
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                        {currentDate ? 'Edit Tanggal Tagihan Berikutnya' : 'Set Tanggal Tagihan Berikutnya'}
                    </h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        <p>{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tanggal Tagihan Berikutnya
                        </label>
                        <input
                            type="date"
                            value={billingDate}
                            onChange={(e) => setBillingDate(e.target.value)}
                            required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Tanggal ini akan digunakan sebagai dasar untuk generate invoice bulanan berikutnya.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            disabled={isLoading}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

