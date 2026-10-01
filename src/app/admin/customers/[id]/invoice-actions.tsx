'use client';

import { useState } from 'react';
import { Trash2, RefreshCw } from 'lucide-react';
import { softDeleteInvoice, recreateXenditInvoice } from '@/app/admin/billing/actions';
import { useRouter } from 'next/navigation';

interface InvoiceActionsProps {
    invoice: {
        id: string;
        status: string;
        xenditUrl?: string | null;
        invoiceNumber?: string | null;
    };
}

export default function InvoiceActions({ invoice }: InvoiceActionsProps) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm('Apakah Anda yakin ingin menghapus invoice ini?')) return;

        setLoading(true);
        try {
            const result = await softDeleteInvoice(invoice.id);
            if (result.success) {
                router.refresh(); // Refresh server component data
            } else {
                alert(`Gagal: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan saat menghapus invoice');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = async () => {
        if (!confirm('Buat invoice Xendit baru untuk tagihan ini? (Status akan direset ke UNPAID)')) return;

        setLoading(true);
        try {
            const result = await recreateXenditInvoice(invoice.id);
            if (result.success) {
                alert('Invoice berhasil diperbarui');
                router.refresh();
            } else {
                alert(`Gagal: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan saat regenerasi invoice');
        } finally {
            setLoading(false);
        }
    };

    if (invoice.status === 'PAID') {
        return <span className="text-xs text-gray-400">-</span>;
    }

    return (
        <div className="flex items-center gap-2">
            {(invoice.status === 'OVERDUE' || invoice.status === 'UNPAID' || invoice.status === 'EXPIRED') && (
                <button
                    onClick={handleRegenerate}
                    disabled={loading}
                    className="text-blue-600 hover:text-blue-900 duration-200"
                    title="Regenerate Invoice Link"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            )}
            <button
                onClick={handleDelete}
                disabled={loading}
                className="text-red-600 hover:text-red-900 duration-200"
                title="Hapus Invoice"
            >
                <Trash2 className="h-4 w-4" />
            </button>
        </div>
    );
}
