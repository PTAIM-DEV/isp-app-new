
'use client';

import { useState } from 'react';
import { Save, MessageSquare } from 'lucide-react';
import { updatePaymentTemplates } from './actions';

interface PaymentTemplatesFormProps {
    settingsMap: Record<string, string>;
}

export function PaymentTemplatesForm({ settingsMap }: PaymentTemplatesFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [customerTemplate, setCustomerTemplate] = useState(settingsMap['whatsapp_payment_success_template'] || '');
    const [salesTemplate, setSalesTemplate] = useState(settingsMap['whatsapp_sales_payment_success_template'] || '');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await updatePaymentTemplates({
                customerTemplate,
                salesTemplate
            });

            if (result.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setError(result.error || 'Gagal menyimpan template');
            }
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="bg-white shadow sm:rounded-lg p-6 max-w-4xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Template Notifikasi Pembayaran Berhasil</h3>
            <p className="text-sm text-gray-500 mb-6">
                Konfigurasi pesan WhatsApp otomatis yang dikirim ketika pembayaran berhasil diterima (via Xendit).
            </p>

            <form onSubmit={handleSubmit} className="space-y-8">
                {success && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                        Template berhasil disimpan!
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                    <p className="font-semibold mb-2">Variabel yang dapat digunakan:</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li><code>{'{{customerName}}'}</code> - Nama Pelanggan</li>
                        <li><code>{'{{invoiceNumber}}'}</code> - Nomor Invoice</li>
                        <li><code>{'{{amount}}'}</code> - Jumlah Pembayaran</li>
                        <li><code>{'{{paymentDate}}'}</code> - Tanggal Pembayaran</li>
                        <li><code>{'{{salesName}}'}</code> - Nama Sales (hanya untuk template sales)</li>
                    </ul>
                </div>

                {/* Customer Template */}
                <div className="border-t pt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2 text-indigo-600" />
                        Pesan untuk Pelanggan (Ucapan Terima Kasih)
                    </h4>
                    <textarea
                        value={customerTemplate}
                        onChange={(e) => setCustomerTemplate(e.target.value)}
                        rows={6}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-mono text-sm"
                        placeholder="Halo {{customerName}}, terima kasih pembayaran invoice {{invoiceNumber}} sebesar {{amount}} telah kami terima..."
                    />
                </div>

                {/* Sales Template */}
                <div className="border-t pt-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <MessageSquare className="w-5 h-5 mr-2 text-orange-600" />
                        Pesan untuk Sales (Notifikasi Pembayaran)
                    </h4>
                    <p className="text-xs text-gray-500 mb-2">
                        Pesan ini akan dikirim ke sales yang bersangkutan dengan jeda waktu 1 menit setelah pesan pelanggan.
                    </p>
                    <textarea
                        value={salesTemplate}
                        onChange={(e) => setSalesTemplate(e.target.value)}
                        rows={6}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-mono text-sm"
                        placeholder="Halo {{salesName}}, pelanggan Anda {{customerName}} baru saja melakukan pembayaran invoice {{invoiceNumber}} sebesar {{amount}}..."
                    />
                </div>

                <div className="flex justify-end pt-4 border-t">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <Save className="-ml-1 mr-2 h-5 w-5" />
                        {isLoading ? 'Menyimpan...' : 'Simpan Template'}
                    </button>
                </div>
            </form>
        </div>
    );
}
