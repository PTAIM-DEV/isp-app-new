
'use client';

import { useState } from 'react';
import { Save, MessageSquare } from 'lucide-react';
import { updateSalesTemplate } from './actions';

interface SalesTemplateFormProps {
    settingsMap: Record<string, string>;
}

export function SalesTemplateForm({ settingsMap }: SalesTemplateFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [template, setTemplate] = useState(settingsMap['whatsapp_sales_invoice_template'] || '');
    const [statusInquiryTemplate, setStatusInquiryTemplate] = useState(settingsMap['whatsapp_sales_status_inquiry_template'] || '');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await updateSalesTemplate(template, statusInquiryTemplate);

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
        <div className="bg-white shadow sm:rounded-lg p-6 max-w-2xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Template Notifikasi Sales</h3>
            <p className="text-sm text-gray-500 mb-6">
                Template pesan WhatsApp yang akan dikirim ke Sales.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
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
                        <li><code>{'{{salesName}}'}</code> - Nama Sales</li>
                        <li><code>{'{{customerName}}'}</code> - Nama Pelanggan</li>
                        <li><code>{'{{invoiceNumber}}'}</code> - Nomor Invoice (Hanya untuk Notifikasi Invoice)</li>
                        <li><code>{'{{amount}}'}</code> - Jumlah Tagihan (Hanya untuk Notifikasi Invoice)</li>
                        <li><code>{'{{dueDate}}'}</code> - Tanggal Jatuh Tempo (Hanya untuk Notifikasi Invoice)</li>
                        <li><code>{'{{period}}'}</code> - Periode Tagihan (jika ada)</li>
                        <li><code>{'{{paymentLink}}'}</code> - Link Pembayaran</li>
                        <li><code>{'{{status}}'}</code> - Status Pelanggan (Untuk Inquiry Status)</li>
                    </ul>
                </div>

                {/* Invoice Notification Template */}
                <div className="border-b border-gray-200 pb-6">
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Template Notifikasi Invoice Baru (Sales)
                    </label>
                    <textarea
                        value={template}
                        onChange={(e) => setTemplate(e.target.value)}
                        rows={6}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-mono text-sm"
                        placeholder="Halo {{salesName}}, pelanggan Anda {{customerName}} memiliki invoice baru..."
                    />
                    <p className="mt-1 text-xs text-gray-500">Dikirim saat invoice baru dibuat.</p>
                </div>

                {/* Status Inquiry Template */}
                <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Template Inquiry Status Pelanggan (Cek Status)
                    </label>
                    <textarea
                        value={statusInquiryTemplate}
                        onChange={(e) => setStatusInquiryTemplate(e.target.value)}
                        rows={6}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-mono text-sm"
                        placeholder="Halo {{salesName}}, boleh minta update status pelanggan {{customerName}}? Saat ini statusnya {{status}}. Apakah masih lanjut?"
                    />
                    <p className="mt-1 text-xs text-gray-500">Dikirim manual via tombol di daftar pelanggan.</p>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <Save className="-ml-1 mr-2 h-5 w-5" />
                        {isLoading ? 'Menyimpan...' : 'Simpan Semua Template'}
                    </button>
                </div>
            </form>
        </div>
    );
}
