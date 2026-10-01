'use client';

import { useState, useTransition } from 'react';
import { Loader2, PlusCircle, AlertTriangle } from 'lucide-react';
import { createManualInvoice } from '../actions';

interface ManualInvoiceButtonProps {
    userId: string;
    defaultAmount: number | null;
    defaultDueDate?: string | null;
    hasSubscription: boolean;
}

function formatDateInput(dateString?: string | null) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
}

export function ManualInvoiceButton({
    userId,
    defaultAmount,
    defaultDueDate,
    hasSubscription,
}: ManualInvoiceButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [dueDate, setDueDate] = useState(formatDateInput(defaultDueDate));
    const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '');
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    const disabled = !hasSubscription;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setStatus(null);

        const numericAmount = Number(amount);
        if (!dueDate) {
            setError('Tanggal jatuh tempo wajib diisi');
            return;
        }
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            setError('Nominal tagihan harus lebih besar dari 0');
            return;
        }

        startTransition(async () => {
            const result = await createManualInvoice(userId, {
                dueDate,
                amount: numericAmount,
                description: '[Manual] Invoice bulanan dibuat oleh admin',
            });

            if (result.success) {
                setStatus(`Invoice ${result.invoiceNumber || ''} berhasil dibuat`);
                setIsOpen(false);
                window.location.reload();
                return;
            }

            setError(result.error || 'Gagal membuat invoice');
        });
    };

    if (!isOpen) {
        return (
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                disabled={disabled}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                title={disabled ? 'Butuh langganan aktif untuk membuat invoice' : 'Buat invoice manual'}
            >
                <PlusCircle className="h-4 w-4 mr-2" />
                Buat Invoice
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Invoice Manual</h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-500"
                        type="button"
                    >
                        ✕
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        <p>{error}</p>
                    </div>
                )}

                {status && (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                        <p>{status}</p>
                    </div>
                )}

                {!hasSubscription && (
                    <div className="mb-4 flex items-start gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded">
                        <AlertTriangle className="h-4 w-4 mt-0.5" />
                        <span>Pelanggan belum memiliki langganan aktif.</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tanggal Jatuh Tempo
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            required
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Sistem otomatis mencegah duplikasi dengan mengecek due date ±1 hari.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nominal Tagihan (Rp)
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            required
                            min={1000}
                            step={1000}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Default mengikuti harga paket pelanggan, bisa disesuaikan bila perlu.
                        </p>
                    </div>

                    <div className="flex justify-end pt-2 space-x-3">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            disabled={isPending}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isPending || disabled}
                            className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    Membuat...
                                </>
                            ) : (
                                'Buat Invoice'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}



