'use client';

import { useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { updateStartDate } from '../actions';

interface EditStartDateProps {
    userId: string;
    currentDate: Date | null;
}

export function EditStartDate({ userId, currentDate }: EditStartDateProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [date, setDate] = useState(
        currentDate ? new Date(currentDate).toISOString().split('T')[0] : ''
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const result = await updateStartDate(userId, date);

            if (result.success) {
                setIsOpen(false);
                // Reload page to show updated data
                window.location.reload();
            } else {
                setError(result.error || 'Gagal mengupdate tanggal mulai langganan');
            }
        } catch (err) {
            setError('Terjadi kesalahan saat mengupdate tanggal');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-900"
                title="Edit tanggal mulai langganan"
            >
                <Calendar className="h-4 w-4" />
            </button>

            {isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">
                            Edit Tanggal Mulai Langganan
                        </h3>

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tanggal Mulai Langganan
                                </label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>

                            {error && (
                                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-sm text-red-800">{error}</p>
                                </div>
                            )}

                            <div className="flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsOpen(false);
                                        setError(null);
                                        setDate(currentDate ? new Date(currentDate).toISOString().split('T')[0] : '');
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                    disabled={isLoading}
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    disabled={isLoading}
                                >
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}


