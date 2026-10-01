'use client';

import { CheckCircle2, XCircle, MessageSquare, Mail, ChevronDown, ChevronUp, Send } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface WelcomeMessageLogProps {
    customerId: string;
    customerName: string;
    customerPhone: string | null;
    customerEmail: string | null;
    whatsappSent: boolean;
    whatsappSentAt: Date | null;
    emailSent: boolean;
    emailSentAt: Date | null;
    whatsappLogs?: Array<{
        id: string;
        content: string;
        status: string;
        createdAt: Date;
    }>;
}

export function WelcomeMessageLog({
    customerId,
    customerName,
    customerPhone,
    customerEmail,
    whatsappSent,
    whatsappSentAt,
    emailSent,
    emailSentAt,
    whatsappLogs = [],
}: WelcomeMessageLogProps) {
    const router = useRouter();
    const [showLogs, setShowLogs] = useState(false);
    const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
    const [sendingEmail, setSendingEmail] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSendWhatsApp = async () => {
        if (!customerPhone) {
            setErrorMessage('Pelanggan tidak memiliki nomor telepon');
            return;
        }

        if (!confirm(`Kirim welcome message WhatsApp ke ${customerName}?`)) {
            return;
        }

        setSendingWhatsapp(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const response = await fetch('/api/admin/customers/send-welcome', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: customerId }),
            });

            // Check if response is ok (status 200-299)
            if (!response.ok) {
                // Try to parse error response
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                setErrorMessage(errorData.error || errorData.message || 'Gagal mengirim welcome message');
                return;
            }

            const data = await response.json();

            if (data.success) {
                setSuccessMessage('Welcome message WhatsApp berhasil dikirim!');
                setTimeout(() => {
                    setSuccessMessage(null);
                    router.refresh();
                }, 2000);
            } else {
                if (data.alreadySent) {
                    const resend = confirm('Welcome message sudah pernah dikirim. Kirim ulang?');
                    if (resend) {
                        const resendResponse = await fetch('/api/admin/customers/send-welcome', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: customerId, forceResend: true }),
                        });

                        if (!resendResponse.ok) {
                            let errorData;
                            try {
                                errorData = await resendResponse.json();
                            } catch {
                                errorData = { error: `HTTP ${resendResponse.status}: ${resendResponse.statusText}` };
                            }
                            setErrorMessage(errorData.error || 'Gagal mengirim welcome message');
                            return;
                        }

                        const resendData = await resendResponse.json();
                        if (resendData.success) {
                            setSuccessMessage('Welcome message WhatsApp berhasil dikirim ulang!');
                            setTimeout(() => {
                                setSuccessMessage(null);
                                router.refresh();
                            }, 2000);
                        } else {
                            setErrorMessage(resendData.error || resendData.message || 'Gagal mengirim welcome message');
                        }
                    }
                } else {
                    setErrorMessage(data.error || data.message || 'Gagal mengirim welcome message');
                }
            }
        } catch (err: any) {
            console.error('[Welcome WhatsApp] Error:', err);
            setErrorMessage(err.message || 'Terjadi kesalahan saat mengirim welcome message');
        } finally {
            setSendingWhatsapp(false);
        }
    };

    const handleSendEmail = async () => {
        if (!customerEmail) {
            setErrorMessage('Pelanggan tidak memiliki alamat email');
            return;
        }

        if (!confirm(`Kirim welcome email ke ${customerEmail}?`)) {
            return;
        }

        setSendingEmail(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        try {
            const response = await fetch('/api/admin/customers/send-welcome-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: customerId }),
            });

            // Check if response is ok (status 200-299)
            if (!response.ok) {
                // Try to parse error response
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
                }
                setErrorMessage(errorData.error || errorData.message || 'Gagal mengirim welcome email');
                return;
            }

            const data = await response.json();

            if (data.success) {
                setSuccessMessage('Welcome email berhasil dikirim!');
                setTimeout(() => {
                    setSuccessMessage(null);
                    router.refresh();
                }, 2000);
            } else {
                if (data.alreadySent) {
                    const resend = confirm('Welcome email sudah pernah dikirim. Kirim ulang?');
                    if (resend) {
                        const resendResponse = await fetch('/api/admin/customers/send-welcome-email', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: customerId, forceResend: true }),
                        });

                        if (!resendResponse.ok) {
                            let errorData;
                            try {
                                errorData = await resendResponse.json();
                            } catch {
                                errorData = { error: `HTTP ${resendResponse.status}: ${resendResponse.statusText}` };
                            }
                            setErrorMessage(errorData.error || 'Gagal mengirim welcome email');
                            return;
                        }

                        const resendData = await resendResponse.json();
                        if (resendData.success) {
                            setSuccessMessage('Welcome email berhasil dikirim ulang!');
                            setTimeout(() => {
                                setSuccessMessage(null);
                                router.refresh();
                            }, 2000);
                        } else {
                            setErrorMessage(resendData.error || resendData.message || 'Gagal mengirim welcome email');
                        }
                    }
                } else {
                    setErrorMessage(data.error || data.message || 'Gagal mengirim welcome email');
                }
            }
        } catch (err: any) {
            console.error('[Welcome Email] Error:', err);
            setErrorMessage(err.message || 'Terjadi kesalahan saat mengirim welcome email');
        } finally {
            setSendingEmail(false);
        }
    };

    return (
        <div className="bg-white shadow sm:rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Welcome Message</h3>
                {whatsappLogs.length > 0 && (
                    <button
                        onClick={() => setShowLogs(!showLogs)}
                        className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                    >
                        {showLogs ? (
                            <>
                                <span>Sembunyikan</span>
                                <ChevronUp className="w-3 h-3 ml-1" />
                            </>
                        ) : (
                            <>
                                <span>Riwayat ({whatsappLogs.length})</span>
                                <ChevronDown className="w-3 h-3 ml-1" />
                            </>
                        )}
                    </button>
                )}
            </div>
            
            <div className="space-y-2">
                {/* WhatsApp Status - Compact */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className={`w-4 h-4 ${whatsappSent ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-xs text-gray-600">WhatsApp:</span>
                        {whatsappSent ? (
                            <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-green-700 font-medium">Sudah</span>
                                {whatsappSentAt && (
                                    <span className="text-xs text-gray-500">
                                        ({formatDate(whatsappSentAt)})
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">Belum</span>
                            </div>
                        )}
                    </div>
                    {!whatsappSent && customerPhone && (
                        <button
                            onClick={handleSendWhatsApp}
                            disabled={sendingWhatsapp}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-3 h-3 mr-1" />
                            {sendingWhatsapp ? 'Mengirim...' : 'Kirim'}
                        </button>
                    )}
                </div>

                {/* Email Status - Compact */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Mail className={`w-4 h-4 ${emailSent ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="text-xs text-gray-600">Email:</span>
                        {emailSent ? (
                            <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-green-700 font-medium">Sudah</span>
                                {emailSentAt && (
                                    <span className="text-xs text-gray-500">
                                        ({formatDate(emailSentAt)})
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">Belum</span>
                            </div>
                        )}
                    </div>
                    {!emailSent && customerEmail && (
                        <button
                            onClick={handleSendEmail}
                            disabled={sendingEmail}
                            className="inline-flex items-center px-2 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-3 h-3 mr-1" />
                            {sendingEmail ? 'Mengirim...' : 'Kirim'}
                        </button>
                    )}
                </div>

                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                        {successMessage}
                    </div>
                )}
                {errorMessage && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                        {errorMessage}
                    </div>
                )}
            </div>

            {/* WhatsApp Logs - Collapsible */}
            {showLogs && whatsappLogs.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="space-y-2">
                        {whatsappLogs.map((log) => (
                            <div
                                key={log.id}
                                className="p-2 bg-gray-50 rounded border border-gray-200 text-xs"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span
                                        className={`px-1.5 py-0.5 text-xs font-semibold rounded ${
                                            log.status === 'SENT'
                                                ? 'bg-green-100 text-green-800'
                                                : log.status === 'PENDING'
                                                ? 'bg-yellow-100 text-yellow-800'
                                                : 'bg-red-100 text-red-800'
                                        }`}
                                    >
                                        {log.status}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {formatDate(log.createdAt)}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600 line-clamp-2 mt-1">
                                    {log.content}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

