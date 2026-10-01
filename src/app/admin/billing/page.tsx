'use client';

import { useState, useEffect, ReactElement } from 'react';
import Link from 'next/link';
import { Trash2, Download, Search, DollarSign, Send, Mail, MessageSquare, X, RotateCcw, Share2, Bell, FileCheck, History, Check, RefreshCw } from 'lucide-react';
import { recreateXenditInvoice } from './actions';
import { Card } from "@/components/ui/card";

interface Invoice {
    id: string;
    invoiceNumber: string | null;
    amount: number;
    dueDate: string;
    status: string;
    xenditUrl: string | null;
    createdAt: string;
    deletedAt: string | null;
    user: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
    };
    paymentMethod: string | null;
    paymentChannel: string | null;
    paidAt: string | null;
    lastReminder: {
        sentAt: string;
        type: string;
        via: {
            email: boolean;
            whatsapp: boolean;
        };
    } | null;
}

interface InvoicesResponse {
    invoices: Invoice[];
    total: number;
}

export default function BillingPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentStatus, setCurrentStatus] = useState('ALL');
    const [showDeleted, setShowDeleted] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
    const [statistics, setStatistics] = useState({ totalAmount: 0, paidAmount: 0, unpaidAmount: 0, overdueAmount: 0 });

    // Filters
    const [customerName, setCustomerName] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Send reminder modal state
    const [showSendModal, setShowSendModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [sendEmail, setSendEmail] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);
    const [sending, setSending] = useState(false);
    const [recreating, setRecreating] = useState(false);

    const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50, 100];

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pagination.page.toString());
            params.append('limit', pagination.limit.toString());
            if (currentStatus !== 'ALL') params.append('status', currentStatus);
            if (showDeleted) params.append('showDeleted', 'true');
            if (customerName) params.append('customerName', customerName);
            if (invoiceNumber) params.append('invoiceNumber', invoiceNumber);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);

            const response = await fetch(`/api/admin/invoices?${params.toString()}`);
            const data = await response.json();

            if (data.success) {
                setInvoices(data.data.invoices);
                setPagination(data.data.pagination);
                if (data.data.statistics) {
                    setStatistics(data.data.statistics);
                }
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [pagination.page, pagination.limit, currentStatus, showDeleted]);

    const handleSearch = () => {
        setPagination({ ...pagination, page: 1 });
        fetchInvoices();
    };

    const handleDelete = async (invoiceId: string) => {
        if (confirm('Apakah Anda yakin ingin menghapus invoice ini?')) {
            try {
                const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
                    method: 'DELETE',
                });
                if (response.ok) {
                    fetchInvoices();
                } else {
                    alert('Gagal menghapus invoice');
                }
            } catch (error) {
                console.error('Error deleting invoice:', error);
                alert('Gagal menghapus invoice');
            }
        }
    };

    const handleRestore = async (invoiceId: string) => {
        if (confirm('Apakah Anda yakin ingin mengembalikan invoice ini?')) {
            try {
                const response = await fetch(`/api/admin/invoices/${invoiceId}/restore`, {
                    method: 'POST',
                });
                const data = await response.json();
                if (data.success) {
                    alert('Invoice berhasil dikembalikan');
                    fetchInvoices();
                } else {
                    alert(`Gagal mengembalikan invoice: ${data.error || data.message}`);
                }
            } catch (error) {
                console.error('Error restoring invoice:', error);
                alert('Gagal mengembalikan invoice');
            }
        }
    };

    const handleSendReminder = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setSendEmail(true);
        setSendWhatsApp(true);
        setShowSendModal(true);
    };

    const confirmSendReminder = async () => {
        if (!selectedInvoice) return;
        if (!sendEmail && !sendWhatsApp) {
            alert('Pilih minimal satu metode pengiriman (Email atau WhatsApp)');
            return;
        }

        setSending(true);
        try {
            const response = await fetch(`/api/admin/invoices/${selectedInvoice.id}/send-reminder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sendEmail,
                    sendWhatsApp,
                }),
            });

            const data = await response.json();

            if (data.success) {
                // Update local state immediately
                setInvoices(prevInvoices => prevInvoices.map(inv => {
                    if (inv.id === selectedInvoice.id) {
                        return {
                            ...inv,
                            lastReminder: {
                                sentAt: new Date().toISOString(),
                                type: data.data.reminder.type,
                                via: {
                                    email: data.data.reminder.email,
                                    whatsapp: data.data.reminder.whatsapp
                                }
                            }
                        };
                    }
                    return inv;
                }));

                alert(`Reminder berhasil dikirim!\nEmail: ${data.data.reminder.email ? '✓' : '✗'}\nWhatsApp: ${data.data.reminder.whatsapp ? '✓' : '✗'}`);
                setShowSendModal(false);
                setSelectedInvoice(null);
            } else {
                alert(`Gagal mengirim reminder: ${data.error || data.message}`);
            }
        } catch (error) {
            console.error('Error sending reminder:', error);
            alert('Gagal mengirim reminder');
        } finally {
            setSending(false);
        }
    };

    const handleNotifySales = async (invoice: Invoice) => {
        if (confirm(`Kirim notifikasi WhatsApp ke Sales untuk invoice ${invoice.invoiceNumber}?`)) {
            try {
                const response = await fetch(`/api/admin/invoices/${invoice.id}/send-sales-notification`, {
                    method: 'POST',
                });
                const data = await response.json();

                if (data.success) {
                    alert(`Notifikasi berhasil dikirim ke Sales: ${data.data.salesName}`);
                } else {
                    alert(`Gagal mengirim notifikasi: ${data.error}`);
                }
            } catch (error) {
                console.error('Error notifying sales:', error);
                alert('Terjadi kesalahan saat mengirim notifikasi');
            }
        }
    };

    const handleSendPaymentNotification = async (invoice: Invoice) => {
        if (confirm(`Kirim notifikasi pembayaran ke user ${invoice.user.name} via WhatsApp?`)) {
            try {
                const response = await fetch(`/api/admin/invoices/${invoice.id}/send-payment-notification`, {
                    method: 'POST',
                });
                const data = await response.json();

                if (data.success) {
                    alert(`Notifikasi berhasil dikirim ke: ${data.data.phone}`);
                } else {
                    alert(`Gagal mengirim notifikasi: ${data.error}`);
                }
            } catch (error) {
                console.error('Error sending payment notification:', error);
                alert('Terjadi kesalahan saat mengirim notifikasi');
            }
        }
    };

    const handleRecreateInvoice = async (invoiceId: string) => {
        if (!confirm('Buat invoice Xendit baru untuk tagihan ini? status akan direset menjadi UNPAID.')) return;

        setRecreating(true);
        try {
            const result = await recreateXenditInvoice(invoiceId);
            if (result.success) {
                alert('Invoice berhasil diperbarui');
                fetchInvoices();
            } else {
                alert(`Gagal: ${result.error}`);
            }
        } catch (error) {
            console.error(error);
            alert('Terjadi kesalahan');
        } finally {
            setRecreating(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, ReactElement> = {
            PAID: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">PAID</span>,
            UNPAID: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">UNPAID</span>,
            OVERDUE: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">OVERDUE</span>,
            EXPIRED: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">EXPIRED</span>,
        };
        return badges[status] || <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    };

    // Calculate statistics
    const stats = {
        total: pagination.total,
        paid: invoices.filter(inv => inv.status === 'PAID').length,
        unpaid: invoices.filter(inv => inv.status === 'UNPAID').length,
        overdue: invoices.filter(inv => inv.status === 'OVERDUE' || inv.status === 'EXPIRED').length,
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <DollarSign className="w-6 h-6" />
                    Tagihan & Billing
                </h2>
                <div className="flex space-x-2">
                    <a href="/api/invoices/export" target="_blank" className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        <Download className="h-4 w-4 mr-2" />
                        Export Paid CSV
                    </a>
                    <Link href="/admin/billing/revenue-report" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700">
                        Laporan Revenue
                    </Link>
                    <Link href="/admin/billing/receivables" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
                        Buku Piutang
                    </Link>
                    <Link href="/admin/billing/transactions" className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700">
                        Riwayat Transaksi
                    </Link>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Card */}
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-indigo-500">
                    <div className="text-sm text-gray-500 mb-2">Total Invoices</div>
                    <div className="text-3xl font-bold text-indigo-600 mb-3">{stats.total}</div>
                    <div className="text-xs text-gray-500 mb-1">Total Nilai</div>
                    <div className="text-lg font-semibold text-gray-900">{formatCurrency(statistics.totalAmount)}</div>
                </div>

                {/* Paid Card */}
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <div className="text-sm text-gray-500 mb-2">Paid</div>
                    <div className="text-3xl font-bold text-green-600 mb-3">{stats.paid}</div>
                    <div className="text-xs text-gray-500 mb-1">Total Nilai</div>
                    <div className="text-lg font-semibold text-gray-900">{formatCurrency(statistics.paidAmount)}</div>
                </div>

                {/* Unpaid Card */}
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-500 mb-2">Unpaid</div>
                    <div className="text-3xl font-bold text-yellow-600 mb-3">{stats.unpaid}</div>
                    <div className="text-xs text-gray-500 mb-1">Total Nilai</div>
                    <div className="text-lg font-semibold text-gray-900">{formatCurrency(statistics.unpaidAmount)}</div>
                </div>

                {/* Overdue Card */}
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                    <div className="text-sm text-gray-500 mb-2">Overdue</div>
                    <div className="text-3xl font-bold text-red-600 mb-3">{stats.overdue}</div>
                    <div className="text-xs text-gray-500 mb-1">Total Nilai</div>
                    <div className="text-lg font-semibold text-gray-900">{formatCurrency(statistics.overdueAmount)}</div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow">
                <div className="border-b border-gray-200">
                    <div className="flex items-center justify-between px-6">
                        <nav className="-mb-px flex space-x-8">
                            {['ALL', 'PAID', 'UNPAID', 'EXPIRED'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => {
                                        setCurrentStatus(tab);
                                        setPagination({ ...pagination, page: 1 });
                                    }}
                                    className={`
                                        whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm
                                        ${currentStatus === tab
                                            ? 'border-indigo-500 text-indigo-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                    `}
                                >
                                    {tab === 'ALL' ? 'Semua' :
                                        tab === 'PAID' ? 'Sudah Dibayar' :
                                            tab === 'UNPAID' ? 'Belum Dibayar' : 'Expired/Overdue'}
                                </button>
                            ))}
                        </nav>
                        <label className="flex items-center pb-4">
                            <input
                                type="checkbox"
                                checked={showDeleted}
                                onChange={(e) => {
                                    setShowDeleted(e.target.checked);
                                    setPagination({ ...pagination, page: 1 });
                                }}
                                className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="text-sm text-gray-700">Tampilkan yang dihapus</span>
                        </label>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Search customer..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                            <input
                                type="text"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="Search invoice..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
                            <select
                                value={pagination.limit}
                                onChange={(e) => setPagination({ ...pagination, limit: parseInt(e.target.value), page: 1 })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                {ITEMS_PER_PAGE_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="mt-4">
                        <button
                            onClick={handleSearch}
                            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <Search className="w-4 h-4 mr-2" />
                            Search
                        </button>
                        <button
                            onClick={() => {
                                setCustomerName('');
                                setInvoiceNumber('');
                                setStartDate('');
                                setEndDate('');
                                setPagination({ ...pagination, page: 1 });
                                fetchInvoices();
                            }}
                            className="ml-2 inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : invoices.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No invoices found</div>
                ) : (
                    <>
                        <div className="relative overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Invoice Number</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Customer</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Amount</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Status</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Pay Via</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Due Date</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Created At</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Payment Link</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invoices.map((invoice) => (
                                        <tr key={invoice.id} className={`hover:bg-gray-50 ${invoice.deletedAt ? 'opacity-60 bg-gray-50' : ''}`}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{invoice.invoiceNumber || `#${invoice.id.slice(-6).toUpperCase()}`}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <Link
                                                    href={`/admin/customers/${invoice.user.id}`}
                                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-900 hover:underline"
                                                >
                                                    {invoice.user.name}
                                                </Link>
                                                <div className="text-sm text-gray-500">{invoice.user.phone}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatCurrency(invoice.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(invoice.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {invoice.paymentMethod ? (
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 capitalize">
                                                            {invoice.paymentMethod.replace(/_/g, ' ').toLowerCase()}
                                                        </span>
                                                        {invoice.paymentChannel && (
                                                            <span className="text-xs text-gray-500">
                                                                {invoice.paymentChannel}
                                                            </span>
                                                        )}
                                                        {invoice.paidAt && (
                                                            <span className="text-xs text-green-600 mt-1">
                                                                {formatDate(invoice.paidAt)}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(invoice.dueDate)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatDate(invoice.createdAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                                                {invoice.xenditUrl ? (
                                                    <a href={invoice.xenditUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                                        Pay Link
                                                    </a>
                                                ) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex items-center justify-end gap-2">
                                                    {invoice.deletedAt ? (
                                                        <button
                                                            onClick={() => handleRestore(invoice.id)}
                                                            className="text-green-600 hover:text-green-900"
                                                            title="Kembalikan Invoice"
                                                        >
                                                            <RotateCcw className="h-5 w-5" />
                                                        </button>
                                                    ) : (
                                                        <>
                                                            {invoice.status !== 'PAID' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleSendReminder(invoice)}
                                                                        className={`${invoice.lastReminder
                                                                            ? 'text-green-600 hover:text-green-900 bg-green-50'
                                                                            : 'text-indigo-600 hover:text-indigo-900'
                                                                            } relative group p-1 rounded transition-colors`}
                                                                        title={invoice.lastReminder
                                                                            ? `Reminder Terakhir: ${formatDate(invoice.lastReminder.sentAt)}\nVia: ${[
                                                                                invoice.lastReminder.via.email ? 'Email' : '',
                                                                                invoice.lastReminder.via.whatsapp ? 'WA' : ''
                                                                            ].filter(Boolean).join(' & ')}`
                                                                            : "Kirim Reminder ke Pelanggan"
                                                                        }
                                                                    >
                                                                        {invoice.lastReminder ? (
                                                                            <div className="relative">
                                                                                <Send className="h-5 w-5" />
                                                                                <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-0.5 border border-white">
                                                                                    <Check className="h-2 w-2 text-white" />
                                                                                </div>
                                                                            </div>
                                                                        ) : (
                                                                            <Send className="h-5 w-5" />
                                                                        )}
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleNotifySales(invoice)}
                                                                        className="text-orange-600 hover:text-orange-900"
                                                                        title="Kirim Reminder ke Sales"
                                                                    >
                                                                        <Bell className="h-5 w-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(invoice.id)}
                                                                        className="text-red-600 hover:text-red-900"
                                                                        title="Hapus Invoice"
                                                                    >
                                                                        <Trash2 className="h-5 w-5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {invoice.status === 'PAID' && (
                                                                <button
                                                                    onClick={() => handleSendPaymentNotification(invoice)}
                                                                    className="text-green-600 hover:text-green-900"
                                                                    title="Kirim Bukti Bayar WhatsApp"
                                                                >
                                                                    <FileCheck className="h-5 w-5" />
                                                                </button>
                                                            )}
                                                            {(invoice.status === 'EXPIRED' || invoice.status === 'OVERDUE') && (
                                                                <button
                                                                    onClick={() => handleRecreateInvoice(invoice.id)}
                                                                    disabled={recreating}
                                                                    className="text-blue-600 hover:text-blue-900"
                                                                    title="Buat Invoice Baru (Xendit)"
                                                                >
                                                                    <RefreshCw className={`h-5 w-5 ${recreating ? 'animate-spin' : ''}`} />
                                                                </button>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                        disabled={pagination.page === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                            <span className="font-medium">
                                                {Math.min(pagination.page * pagination.limit, pagination.total)}
                                            </span>{' '}
                                            of <span className="font-medium">{pagination.total}</span> results
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                            <button
                                                onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                                                disabled={pagination.page === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Previous
                                            </button>
                                            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                                .filter(page => {
                                                    if (pagination.totalPages <= 7) return true;
                                                    return Math.abs(page - pagination.page) <= 2 || page === 1 || page === pagination.totalPages;
                                                })
                                                .map((page, idx, arr) => (
                                                    <div key={page}>
                                                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                                ...
                                                            </span>
                                                        )}
                                                        <button
                                                            onClick={() => setPagination({ ...pagination, page })}
                                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${pagination.page === page
                                                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {page}
                                                        </button>
                                                    </div>
                                                ))}
                                            <button
                                                onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                                                disabled={pagination.page === pagination.totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                Next
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Send Reminder Modal */}
            {showSendModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                        <div className="flex justify-between items-center p-6 border-b">
                            <h3 className="text-lg font-semibold">Kirim Reminder Pembayaran</h3>
                            <button
                                onClick={() => {
                                    setShowSendModal(false);
                                    setSelectedInvoice(null);
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            <div className="mb-4">
                                <div className="text-sm text-gray-600 mb-2">Invoice:</div>
                                <div className="font-semibold text-gray-900">{selectedInvoice.invoiceNumber || `#${selectedInvoice.id.slice(-6).toUpperCase()}`}</div>
                            </div>

                            <div className="mb-4">
                                <div className="text-sm text-gray-600 mb-2">Pelanggan:</div>
                                <div className="font-semibold text-gray-900">{selectedInvoice.user.name}</div>
                            </div>

                            <div className="mb-4 space-y-2">
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-5 w-5 text-gray-600" />
                                        <span className="text-sm font-medium">Email</span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {selectedInvoice.user.email || 'Tidak ada email'}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-gray-600" />
                                        <span className="text-sm font-medium">WhatsApp</span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        {selectedInvoice.user.phone || 'Tidak ada nomor'}
                                    </div>
                                </div>
                            </div>

                            <div className="mb-6">
                                <div className="text-sm font-medium text-gray-700 mb-3">Pilih metode pengiriman:</div>
                                <div className="space-y-3">
                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={sendEmail}
                                            onChange={(e) => setSendEmail(e.target.checked)}
                                            disabled={!selectedInvoice.user.email}
                                            className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4 text-gray-600" />
                                                <span className="font-medium">Email</span>
                                            </div>
                                            {!selectedInvoice.user.email && (
                                                <div className="text-xs text-red-500 mt-1">Email tidak tersedia</div>
                                            )}
                                        </div>
                                    </label>

                                    <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                        <input
                                            type="checkbox"
                                            checked={sendWhatsApp}
                                            onChange={(e) => setSendWhatsApp(e.target.checked)}
                                            disabled={!selectedInvoice.user.phone}
                                            className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                        />
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <MessageSquare className="h-4 w-4 text-gray-600" />
                                                <span className="font-medium">WhatsApp</span>
                                            </div>
                                            {!selectedInvoice.user.phone && (
                                                <div className="text-xs text-red-500 mt-1">Nomor WhatsApp tidak tersedia</div>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                            <button
                                onClick={() => {
                                    setShowSendModal(false);
                                    setSelectedInvoice(null);
                                }}
                                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                disabled={sending}
                            >
                                Batal
                            </button>
                            <button
                                onClick={confirmSendReminder}
                                disabled={sending || (!sendEmail && !sendWhatsApp)}
                                className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {sending ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Mengirim...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Kirim Reminder
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
