'use client';

import { useState } from 'react';
import { completeInstallation } from './actions';
import { Loader2, CheckCircle } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface CompleteInstallationButtonProps {
    userId: string;
}

export function CompleteInstallationButton({ userId }: CompleteInstallationButtonProps) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [showConfirm, setShowConfirm] = useState(false);

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
        e.preventDefault();
        setShowConfirm(true);
    }

    async function handleConfirm() {
        setShowConfirm(false);
        setLoading(true);
        setMessage('');

        const result = await completeInstallation(userId);

        if (result.success) {
            // No need to set message or reload. 
            // revalidatePath on server will trigger a UI update.
            // We keep loading=true so the button stays in "Processing..." state until the new UI arrives.
        } else {
            setMessage(result.error || 'Gagal menyelesaikan instalasi');
            setLoading(false);
        }
    }

    return (
        <div className="space-y-2">
            <button
                onClick={handleClick}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Memproses...
                    </>
                ) : (
                    <>
                        <CheckCircle className="-ml-1 mr-2 h-5 w-5" />
                        Tandai Instalasi Selesai
                    </>
                )}
            </button>
            {message && (
                <p className={`text-sm ${message.includes('berhasil') ? 'text-green-600' : 'text-red-600'}`}>
                    {message}
                </p>
            )}

            <ConfirmationDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirm}
                title="Konfirmasi Instalasi"
                message="Apakah Anda yakin instalasi sudah selesai?"
            />
        </div>
    );
}
