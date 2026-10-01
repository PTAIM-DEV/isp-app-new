'use client';

import { useState } from 'react';
import { activateCustomer } from './actions';
import { Loader2, CheckCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ActivateFormProps {
    userId: string;
    currentStatus: string;
    selectedPackageId?: string | null;
    assignedPaymentFlowId?: string | null;
}

export function ActivateForm({ userId, currentStatus, selectedPackageId, assignedPaymentFlowId }: ActivateFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [trialDays, setTrialDays] = useState('');
    const [promoCode, setPromoCode] = useState('');

    // If already active, show badge
    if (currentStatus === 'ACTIVE') {
        return (
            <div className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100">
                <CheckCircle className="mr-2 h-5 w-5" />
                Pelanggan Aktif
            </div>
        );
    }

    // If not INSTALLED status, don't show activation button
    if (currentStatus !== 'INSTALLED') {
        return null;
    }

    async function handleActivate(e: React.FormEvent) {
        e.preventDefault();

        if (!assignedPaymentFlowId || !selectedPackageId) {
            setError('Payment Flow atau Package tidak ditemukan');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await activateCustomer(
                userId,
                assignedPaymentFlowId,
                selectedPackageId,
                trialDays ? parseInt(trialDays) : undefined,
                promoCode || undefined
            );

            if (!result.success) {
                setError(result.error || 'Gagal mengaktifkan pelanggan');
                setIsLoading(false);
            } else {
                // Success - reload page
                router.refresh();
            }
        } catch (e) {
            console.error('Activation error:', e);
            setError('Terjadi kesalahan sistem');
            setIsLoading(false);
        }
    }

    return (
        <form onSubmit={handleActivate} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Durasi Trial (hari) - Opsional
                </label>
                <input
                    type="number"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    placeholder="Kosongkan untuk default"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Promo Code (Opsional)
                </label>
                <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Masukkan kode promo"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                />
            </div>

            {error && (
                <div className="rounded-md bg-red-50 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
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
        </form>
    );
}
