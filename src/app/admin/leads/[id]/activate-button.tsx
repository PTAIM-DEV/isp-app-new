'use client';

import { useState } from 'react';
import { activateCustomer } from './actions';
import { Loader2, CheckCircle, AlertCircle, X } from 'lucide-react';

export function ActivateButton({ 
    userId, 
    currentStatus,
    paymentFlowId,
    packageId,
    trialDays,
    promoCode
}: { 
    userId: string;
    currentStatus: string;
    paymentFlowId?: string;
    packageId?: string;
    trialDays?: number;
    promoCode?: string;
}) {
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');

    if (currentStatus === 'ACTIVE') {
        return (
            <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100">
                <CheckCircle className="mr-2 h-5 w-5" />
                Pelanggan Aktif
            </div>
        );
    }

    async function handleActivate() {
        if (!paymentFlowId || !packageId) {
            setError('Payment Flow atau Package tidak ditemukan');
            return;
        }

        setShowConfirm(false);
        setIsLoading(true);
        setError('');

        const result = await activateCustomer(
            userId,
            paymentFlowId,
            packageId,
            trialDays,
            promoCode
        );
        setIsLoading(false);

        if (!result.success) {
            setError(result.error || 'Gagal mengaktifkan pelanggan');
        }
    }

    return (
        <>
            <button
                onClick={() => setShowConfirm(true)}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Mengaktifkan...
                    </>
                ) : (
                    'Aktifkan Pelanggan'
                )}
            </button>

            {/* Confirmation Toast */}
            {showConfirm && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top">
                    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm">
                        <div className="flex items-start">
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-gray-900 mb-1">
                                    Konfirmasi Aktivasi
                                </h3>
                                <p className="text-xs text-gray-500">
                                    Aktifkan pelanggan ini? Tagihan akan mulai berjalan.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="ml-2 text-gray-400 hover:text-gray-500"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="flex space-x-2 mt-3">
                            <button
                                onClick={() => setShowConfirm(false)}
                                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleActivate}
                                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                            >
                                Ya, Aktifkan
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top">
                    <div className="bg-white rounded-lg shadow-lg border border-red-200 p-4 max-w-sm">
                        <div className="flex items-start">
                            <AlertCircle className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-gray-900 mb-1">
                                    Gagal Aktivasi
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {error}
                                </p>
                            </div>
                            <button
                                onClick={() => setError('')}
                                className="ml-2 text-gray-400 hover:text-gray-500"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
