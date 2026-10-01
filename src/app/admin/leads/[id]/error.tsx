'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error('Lead Detail Page Error:', error);
    }, [error]);

    return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
            <h2 className="text-lg font-semibold text-red-800">Terjadi Kesalahan!</h2>
            <p className="mt-2 text-red-600">{error.message || 'Gagal memuat halaman detail pelanggan.'}</p>
            <p className="text-xs text-red-500 mt-1">Digest: {error.digest}</p>
            <button
                onClick={() => reset()}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
                Coba Lagi
            </button>
        </div>
    );
}
