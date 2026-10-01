'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteCustomer } from '../actions';
import { useRouter } from 'next/navigation';

interface DeleteCustomerButtonProps {
    customerId: string;
    customerName: string;
}

export function DeleteCustomerButton({ customerId, customerName }: DeleteCustomerButtonProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    const handleDelete = async () => {
        if (!confirm(`Apakah Anda yakin ingin menghapus pelanggan "${customerName}"?\n\nData kontak akan tetap disimpan di Contact List.`)) {
            return;
        }

        setIsDeleting(true);

        try {
            const result = await deleteCustomer(customerId);

            if (result.success) {
                alert('Pelanggan berhasil dihapus. Data kontak telah disimpan di Contact List.');
                router.push('/admin/customers');
                router.refresh();
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message || 'Gagal menghapus pelanggan'}`);
        } finally {
            setIsDeleting(false);
            setShowConfirm(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Menghapus...' : 'Hapus Pelanggan'}
        </button>
    );
}

