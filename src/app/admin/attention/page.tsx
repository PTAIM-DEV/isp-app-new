'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Hammer, UserX, Send, ArrowRight, CheckCircle, RefreshCcw, MessageSquare, Check } from 'lucide-react';
import { getAttentionItems, manualBlockUser, manualUnblockUser, sendManualBillingReminder, AttentionItem } from './actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AttentionPage() {
    const router = useRouter();
    const [items, setItems] = useState<AttentionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const data = await getAttentionItems();
            setItems(data);
        } catch (error) {
            console.error('Failed to fetch attention items', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleBlockUser = async (userId: string, itemId: string) => {
        if (!confirm('Apakah Anda yakin ingin MEMBLOKIR user ini? User tidak akan bisa internetan.')) return;

        setProcessingId(itemId);
        const res = await manualBlockUser(userId);
        setProcessingId(null);

        if (res.success) {
            alert('User berhasil diblokir.');
            fetchItems();
        } else {
            alert('Gagal memblokir: ' + res.error);
        }
    };

    const handleUnblockUser = async (userId: string, itemId: string) => {
        if (!confirm('Apakah Anda yakin ingin membuka blokir user ini?')) return;

        setProcessingId(itemId);
        const res = await manualUnblockUser(userId);
        setProcessingId(null);

        if (res.success) {
            alert('User berhasil di-unblock.');
            fetchItems();
        } else {
            alert('Gagal unblock: ' + res.error);
        }
    };

    const handleSendReminder = async (invoiceId: string, itemId: string) => {
        if (!confirm('Kirim reminder WhatsApp manual sekarang?')) return;

        setProcessingId(itemId);
        const res = await sendManualBillingReminder(invoiceId);
        setProcessingId(null);

        if (res.success) {
            alert('Reminder berhasil dikirim (antrian).');
            // Optional: remove item or keep it until paid?
            // Usually keep it, but maybe show indicator
        } else {
            alert('Gagal mengirim reminder: ' + res.error);
        }
    };

    const openWhatsApp = (phone: string, message: string) => {
        const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
        const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    };

    const renderItem = (item: AttentionItem) => {
        let icon = <AlertTriangle className="h-5 w-5 text-gray-500" />;
        let bgColor = "bg-white";
        let borderColor = "border-gray-200";

        if (item.type === 'OVERDUE_INVOICE') {
            icon = <AlertTriangle className="h-6 w-6 text-red-600" />;
            borderColor = "border-l-4 border-l-red-500";
        } else if (item.type === 'STUCK_ONBOARDING') {
            icon = <Clock className="h-6 w-6 text-orange-500" />;
            borderColor = "border-l-4 border-l-orange-400";
        } else if (item.type === 'STUCK_INSTALLATION') {
            icon = <Hammer className="h-6 w-6 text-blue-500" />;
            borderColor = "border-l-4 border-l-blue-400";
        }

        const isProcessing = processingId === item.id;

        return (
            <Card key={`${item.type}-${item.id}`} className={`mb-4 ${borderColor}`}>
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="mt-1">{icon}</div>
                        <div>
                            <h4 className="font-semibold text-gray-900">{item.title}</h4>
                            <p className="text-sm text-gray-600 mb-1">{item.description}</p>
                            <span className="text-xs text-gray-400">
                                {item.type === 'OVERDUE_INVOICE' && 'Billing • High Priority'}
                                {item.type === 'STUCK_ONBOARDING' && 'Sales • Potential Churn'}
                                {item.type === 'STUCK_INSTALLATION' && 'Technical • Service Delay'}
                                {' • '}{new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
                        {/* Actions for OVERDUE */}
                        {item.type === 'OVERDUE_INVOICE' && (
                            <>
                                <button
                                    onClick={() => handleSendReminder(item.data.invoiceId, item.id)}
                                    disabled={isProcessing}
                                    className="px-3 py-1.5 bg-green-50 text-green-700 rounded hover:bg-green-100 text-sm font-medium flex items-center"
                                >
                                    <MessageSquare className="w-4 h-4 mr-1.5" />
                                    Reminder WA
                                </button>
                                {item.data.status === 'BLOCKED' ? (
                                    <button
                                        onClick={() => handleUnblockUser(item.data.userId, item.id)}
                                        disabled={isProcessing}
                                        className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-sm font-medium flex items-center"
                                    >
                                        <Check className="w-4 h-4 mr-1.5" />
                                        Unblock
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleBlockUser(item.data.userId, item.id)}
                                        disabled={isProcessing}
                                        className="px-3 py-1.5 bg-red-50 text-red-700 rounded hover:bg-red-100 text-sm font-medium flex items-center"
                                    >
                                        <UserX className="w-4 h-4 mr-1.5" />
                                        Blokir
                                    </button>
                                )}
                            </>
                        )}

                        {/* Actions for STUCK ONBOARDING */}
                        {item.type === 'STUCK_ONBOARDING' && (
                            <button
                                onClick={() => openWhatsApp(item.data.phone, `Halo kak ${item.title.replace('Stuck Lead: ', '')}, terima kasih sudah mendaftar. Ada kendala saat pembayaran? Bisa kami bantu?`)}
                                className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium flex items-center"
                            >
                                <MessageSquare className="w-4 h-4 mr-1.5" />
                                Follow Up
                            </button>
                        )}

                        {/* Actions for STUCK INSTALLATION */}
                        {item.type === 'STUCK_INSTALLATION' && (
                            <Link href={`/admin/leads/${item.data.userId}`} className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium flex items-center">
                                <ArrowRight className="w-4 h-4 mr-1.5" />
                                Atur Jadwal
                            </Link>
                        )}
                    </div>
                </CardContent>
            </Card>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <AlertTriangle className="w-8 h-8 text-orange-600" />
                        Action Center
                    </h1>
                    <p className="text-gray-500">
                        Pusat tindakan manual untuk masalah yang membutuhkan perhatian admin.
                    </p>
                </div>
                <button
                    onClick={fetchItems}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                    <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                    <p className="mt-2 text-gray-500">Memuat data...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-green-100 shadow-sm">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Semua Aman!</h3>
                    <p className="text-gray-500">Tidak ada isu mendesak yang butuh perhatian saat ini.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                            <div className="text-red-600 font-medium text-sm">Billing Issues</div>
                            <div className="text-2xl font-bold text-red-700">
                                {items.filter(i => i.type === 'OVERDUE_INVOICE').length}
                            </div>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                            <div className="text-orange-600 font-medium text-sm">Stuck Leads</div>
                            <div className="text-2xl font-bold text-orange-700">
                                {items.filter(i => i.type === 'STUCK_ONBOARDING').length}
                            </div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                            <div className="text-blue-600 font-medium text-sm">Service Delays</div>
                            <div className="text-2xl font-bold text-blue-700">
                                {items.filter(i => i.type === 'STUCK_INSTALLATION').length}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold text-gray-800">Daftar Tindakan</h2>
                        {items.map(renderItem)}
                    </div>
                </div>
            )}
        </div>
    );
}
