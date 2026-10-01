'use client';

import { useState } from 'react';
import { resetPaymentFlow } from './actions';
import { Loader2, Edit } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface ResetPaymentFlowButtonProps {
    userId: string;
}

export function ResetPaymentFlowButton({ userId }: ResetPaymentFlowButtonProps) {
    const [loading, setLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        setShowConfirm(true);
    }

    async function handleReset() {
        setShowConfirm(false);
        setLoading(true);

        const result = await resetPaymentFlow(userId);

        if (result.success) {
            // revalidatePath handles update
        } else {
            alert(result.error || 'Gagal reset payment flow');
            setLoading(false);
        }
    }

    return (
        <>
            <button
                onClick={handleClick}
                disabled={loading}
                className="text-indigo-600 hover:text-indigo-900 text-xs font-medium inline-flex items-center ml-2"
            >
                {loading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <>
                        <Edit className="h-3 w-3 mr-1" />
                        Ubah
                    </>
                )}
            </button>

            <ConfirmationDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleReset}
                title="Ubah Payment Flow"
                message="Apakah Anda yakin ingin mengubah payment flow? Invoice yang sudah dibuat mungkin perlu dibatalkan manual."
                confirmLabel="Ya, Ubah"
            />
        </>
    );
}
