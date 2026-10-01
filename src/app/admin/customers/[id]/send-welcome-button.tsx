'use client';

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';

interface SendWelcomeButtonProps {
    customerId: string;
    customerName: string;
    customerPhone: string | null;
}

export function SendWelcomeButton({ customerId, customerName, customerPhone }: SendWelcomeButtonProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSendWelcome = async () => {
        if (!customerPhone) {
            alert('Pelanggan tidak memiliki nomor telepon');
            return;
        }

        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            // First check if already sent
            const checkResponse = await fetch('/api/admin/customers/send-welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: customerId }),
            });
            const checkData = await checkResponse.json();
            
            let forceResend = false;
            
            if (!checkData.success && checkData.alreadySent) {
                const resend = confirm(`Welcome message sudah pernah dikirim sebelumnya.\n\nKirim ulang welcome message?`);
                if (!resend) {
                    setIsLoading(false);
                    return;
                }
                forceResend = true;
            } else {
                if (!confirm(`Kirim welcome message WhatsApp ke ${customerName}?`)) {
                    setIsLoading(false);
                    return;
                }
            }

            // Send welcome message
            const response = await fetch('/api/admin/customers/send-welcome', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: customerId, forceResend }),
            });

            const data = await response.json();

            if (data.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                if (data.alreadySent && !forceResend) {
                    // This shouldn't happen, but handle it
                    setError('Welcome message sudah pernah dikirim. Silakan coba lagi untuk mengirim ulang.');
                } else {
                    setError(data.error || data.message || 'Gagal mengirim welcome message');
                }
            }
        } catch (err) {
            setError('Terjadi kesalahan saat mengirim welcome message');
        } finally {
            setIsLoading(false);
        }
    };

    if (!customerPhone) {
        return null;
    }

    return (
        <div className="mb-4">
            <button
                onClick={handleSendWelcome}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
                <MessageSquare className="h-4 w-4 mr-2" />
                {isLoading ? 'Mengirim...' : 'Kirim Welcome Message'}
            </button>

            {success && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">Welcome message berhasil dikirim!</p>
                </div>
            )}

            {error && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{error}</p>
                </div>
            )}
        </div>
    );
}

