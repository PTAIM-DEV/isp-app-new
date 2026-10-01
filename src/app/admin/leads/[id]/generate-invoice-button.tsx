'use client';

import { useState } from 'react';
import { generateInstallationInvoiceForGate, generateFirstMonthInvoiceForGate, previewInvoice } from './actions';
import { Loader2, FileText, Check, ChevronRight } from 'lucide-react';

interface GenerateInvoiceButtonProps {
    userId: string;
    type: 'installation' | 'firstMonth';
    promoCode?: string;
}

export function GenerateInvoiceButton({ userId, type, promoCode }: GenerateInvoiceButtonProps) {
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<any>(null);
    const [error, setError] = useState('');

    const actionType = type === 'installation' ? 'installation' : 'first-month';
    const label = type === 'installation' ? 'Invoice' : 'Invoice Bulan Pertama';

    async function handlePreview() {
        setLoading(true);
        setError('');

        const result = await previewInvoice(userId, actionType);

        if (result.success) {
            setPreviewData(result.data);
        } else {
            setError(result.error || 'Gagal preview invoice');
        }
        setLoading(false);
    }

    async function handleGenerate() {
        setLoading(true);
        setError('');

        const result = type === 'installation'
            ? await generateInstallationInvoiceForGate(userId)
            : await generateFirstMonthInvoiceForGate(userId, promoCode);

        if (result.success) {
            window.location.reload();
        } else {
            setError(result.error || 'Gagal generate invoice');
            setLoading(false);
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
    };

    if (previewData) {
        return (
            <div className="space-y-4">
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                        <h3 className="text-sm font-medium text-gray-900">Preview Invoice</h3>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Deskripsi:</span>
                            <span className="font-medium text-gray-900">{previewData.invoiceDescription}</span>
                        </div>

                        {previewData.appliedPromo && (
                            <div className="flex justify-between text-sm bg-green-50 p-2 rounded">
                                <span className="text-green-700">Promo ({previewData.appliedPromo.code}):</span>
                                <span className="font-medium text-green-700">
                                    {previewData.appliedPromo.type === 'BONUS_MONTHS'
                                        ? `Bonus ${previewData.actualBonusMonths} Bulan`
                                        : 'Diskon Applied'}
                                </span>
                            </div>
                        )}

                        <div className="border-t border-gray-100 pt-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Subtotal:</span>
                                <span className="text-gray-900">{formatCurrency(previewData.subtotal)}</span>
                            </div>
                            {previewData.taxAmount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">PPN (11%):</span>
                                    <span className="text-gray-900">{formatCurrency(previewData.taxAmount)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Biaya Admin:</span>
                                <span className="text-gray-900">{formatCurrency(previewData.feeAmount)}</span>
                            </div>
                            <div className="flex justify-between text-base font-bold border-t border-gray-200 pt-2 mt-2">
                                <span className="text-gray-900">Total:</span>
                                <span className="text-indigo-600">{formatCurrency(previewData.totalAmount)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex justify-end space-x-3">
                        <button
                            onClick={() => setPreviewData(null)}
                            className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                            disabled={loading}
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            ) : (
                                <Check className="h-4 w-4 mr-2" />
                            )}
                            Konfirmasi & Generate
                        </button>
                    </div>
                </div>
                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        {error}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-3">
                    <strong>Langkah selanjutnya:</strong> Generate invoice untuk pembayaran {type === 'installation' ? 'instalasi' : 'bulan pertama'}.
                </p>

                {error && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        {error}
                    </div>
                )}

                <button
                    onClick={handlePreview}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-white border border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors disabled:opacity-50 font-medium"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            Loading Preview...
                        </>
                    ) : (
                        <>
                            <ChevronRight className="h-4 w-4 mr-2" />
                            Preview {label}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
