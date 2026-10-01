'use client';

import { useState } from 'react';
import { saveSales } from './actions';
import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function SalesForm({ initialData }: { initialData?: any }) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError('');

        const result = await saveSales(formData, initialData?.id);

        setIsLoading(false);
        if (result.success) {
            router.push('/admin/sales');
        } else {
            setError(result.error || 'Gagal menyimpan data');
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            {error && (
                <div className="p-4 rounded-md bg-red-50 text-red-700">
                    {error}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                <input
                    type="text"
                    name="name"
                    required
                    defaultValue={initialData?.name}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Nomor Telepon</label>
                <input
                    type="tel"
                    name="phone"
                    required
                    defaultValue={initialData?.phone}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Email (Opsional)</label>
                <input
                    type="email"
                    name="email"
                    defaultValue={initialData?.email}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                    name="status"
                    defaultValue={initialData?.status || 'ACTIVE'}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Non-Aktif</option>
                </select>
            </div>

            <div className="flex justify-end">
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
                        'Simpan'
                    )}
                </button>
            </div>
        </form>
    );
}











