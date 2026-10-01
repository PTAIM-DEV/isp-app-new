'use client';

import { useState } from 'react';
import { markInvoiceAsPaid, archiveInvoice } from './actions';
import { generateWhatsAppPaymentLink, formatInvoiceAmount } from '@/lib/payment-gate';
import { formatDate } from '@/lib/utils';
import { AlertCircle, MessageSquare, CheckCircle, Copy, Loader2, Trash2 } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface PaymentGateCardProps {
    invoice: any;
    customerName: string;
    customerPhone: string;
}

export function PaymentGateCard({ invoice, customerName, customerPhone }: PaymentGateCardProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);
    const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        setShowConfirm(true);
    }

    async function handleMarkPaid() {
        setShowConfirm(false);
        setLoading(true);
        setMessage('');

        const result = await markInvoiceAsPaid(invoice.id);

        if (result.success) {
            setMessage('Invoice berhasil ditandai sebagai PAID!');
            // revalidatePath handles update
        } else {
            setMessage(result.error || 'Gagal update status');
            setLoading(false);
        }
    }

    async function handleArchive() {
        setShowArchiveConfirm(false);
        setLoading(true);
        setMessage('');

        const result = await archiveInvoice(invoice.id);

        if (result.success) {
            setMessage('Invoice berhasil dibatalkan!');
            // revalidatePath handles update
        } else {
            setMessage(result.error || 'Gagal membatalkan invoice');
            setLoading(false);
        }
    }

    function handleSendWhatsApp() {
        const waLink = generateWhatsAppPaymentLink(customerPhone, invoice, customerName);
        window.open(waLink, '_blank');
    }

    function handleCopyLink() {
        if (invoice.xenditUrl) {
            navigator.clipboard.writeText(invoice.xenditUrl);
            setMessage('Link berhasil dicopy!');
            setTimeout(() => setMessage(''), 2000);
        }
    }

    return (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
            <div className="flex items-start">
                <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0 mt-1" />
                <div className="flex-1">
                    <h4 className="text-lg font-semibold text-yellow-900 mb-2">
                        ⏸️ Menunggu Pembayaran (v1.1)
                    </h4>
                    <p className="text-sm text-yellow-800 mb-4">
                        Proses selanjutnya diblokir sampai invoice dibayar.
                    </p>

                    <div className="bg-white rounded-md p-4 mb-4">
                        <dl className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <dt className="text-gray-600">Invoice Number:</dt>
                                <dd className="font-mono font-semibold">{invoice.invoiceNumber || 'Pending'}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-600">Subtotal:</dt>
                                <dd className="font-mono">{formatInvoiceAmount(invoice.subtotal || invoice.amount)}</dd>
                            </div>
                            {invoice.taxAmount > 0 && (
                                <div className="flex justify-between text-gray-500">
                                    <dt>PPN (11%):</dt>
                                    <dd>+ {formatInvoiceAmount(invoice.taxAmount)}</dd>
                                </div>
                            )}
                            {invoice.feeAmount > 0 && (
                                <div className="flex justify-between text-gray-500">
                                    <dt>Biaya Admin:</dt>
                                    <dd>+ {formatInvoiceAmount(invoice.feeAmount)}</dd>
                                </div>
                            )}
                            <div className="flex justify-between border-t pt-2 mt-2">
                                <dt className="font-semibold text-gray-900">Total Amount:</dt>
                                <dd className="font-bold text-lg text-indigo-600">{formatInvoiceAmount(invoice.amount)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-600">Due Date:</dt>
                                <dd>{formatDate(invoice.dueDate)}</dd>
                            </div>
                            <div className="flex justify-between">
                                <dt className="text-gray-600">Status:</dt>
                                <dd>
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold">
                                        {invoice.status}
                                    </span>
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {invoice.xenditUrl ? (
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Payment Link:
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={invoice.xenditUrl}
                                    readOnly
                                    className="flex-1 text-sm border rounded px-3 py-2 bg-gray-50 font-mono text-gray-900"
                                />
                                <button
                                    onClick={() => window.open(invoice.xenditUrl, '_blank')}
                                    className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded text-sm flex items-center"
                                    title="Buka Link Pembayaran"
                                >
                                    Open
                                </button>
                                <button
                                    onClick={handleCopyLink}
                                    className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm flex items-center"
                                    title="Copy link"
                                >
                                    <Copy className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-md p-3">
                            <p className="text-sm text-orange-800">
                                ⚠️ <strong>Testing Mode:</strong> Xendit payment link tidak tersedia (API key belum di-setup).
                                Gunakan tombol "Tandai Sudah Bayar" untuk simulasi.
                            </p>
                        </div>
                    )}

                    {message && (
                        <div className={`mb-4 p-3 rounded-md text-sm ${message.includes('berhasil') ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
                            }`}>
                            {message}
                        </div>
                    )}

                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={handleSendWhatsApp}
                                disabled={!invoice.xenditUrl}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!invoice.xenditUrl ? 'Payment link tidak tersedia' : 'Kirim via WhatsApp'}
                            >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Kirim via WhatsApp
                            </button>

                            <button
                                onClick={handleClick}
                                disabled={loading}
                                className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="animate-spin h-4 w-4 mr-2" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Tandai Sudah Bayar (Testing)
                                    </>
                                )}
                            </button>
                        </div>

                        {invoice.status === 'UNPAID' && (
                            <button
                                onClick={() => setShowArchiveConfirm(true)}
                                disabled={loading}
                                className="w-full inline-flex items-center justify-center px-4 py-2 bg-white border border-red-300 text-red-700 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 text-sm"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Batalkan Invoice (Ada Kesalahan)
                            </button>
                        )}
                    </div>

                    <p className="text-xs text-yellow-700 mt-3">
                        💡 <strong>Testing:</strong> Gunakan tombol "Tandai Sudah Bayar" untuk simulasi pembayaran berhasil.
                    </p>

                    <ConfirmationDialog
                        isOpen={showConfirm}
                        onClose={() => setShowConfirm(false)}
                        onConfirm={handleMarkPaid}
                        title="Konfirmasi Pembayaran"
                        message="Apakah Anda yakin invoice ini sudah dibayar? Status akan berubah menjadi PAID."
                        confirmLabel="Ya, Sudah Bayar"
                    />

                    <ConfirmationDialog
                        isOpen={showArchiveConfirm}
                        onClose={() => setShowArchiveConfirm(false)}
                        onConfirm={handleArchive}
                        title="Batalkan Invoice"
                        message="Apakah Anda yakin ingin membatalkan invoice ini? Invoice akan diarsipkan dan Anda dapat membuat invoice baru."
                        confirmLabel="Ya, Batalkan Invoice"
                        variant="danger"
                    />
                </div>
            </div>
        </div>
    );
}
