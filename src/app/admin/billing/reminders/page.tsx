'use client';

import { useState, useEffect } from 'react';
import { Bell, Search, Filter, Calendar, CheckCircle, XCircle, Clock, AlertCircle, Mail, MessageSquare } from 'lucide-react';

interface ReminderLog {
    id: string;
    reminderType: string;
    status: string;
    scheduledAt: string;
    sentAt: string | null;
    createdAt: string;
    retryCount: number;
    lastError: string | null;
    emailSent: boolean;
    whatsappSent: boolean;
    invoice: {
        id: string;
        invoiceNumber: string | null;
        amount: number;
        dueDate: string;
        status: string;
    };
    customer: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
    };
}

interface ReminderLogsResponse {
    success: boolean;
    data: {
        logs: ReminderLog[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
        statistics: {
            pending: number;
            sent: number;
            failed: number;
            cancelled: number;
            total: number;
        };
    };
}

export default function ReminderLogsPage() {
    const [logs, setLogs] = useState<ReminderLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });
    const [statistics, setStatistics] = useState({ pending: 0, sent: 0, failed: 0, cancelled: 0, total: 0 });

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [reminderTypeFilter, setReminderTypeFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [invoiceNumber, setInvoiceNumber] = useState('');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pagination.page.toString());
            params.append('limit', pagination.limit.toString());
            if (statusFilter) params.append('status', statusFilter);
            if (reminderTypeFilter) params.append('reminderType', reminderTypeFilter);
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (customerName) params.append('customerName', customerName);
            if (invoiceNumber) params.append('invoiceNumber', invoiceNumber);

            const response = await fetch(`/api/admin/reminder-logs?${params.toString()}`);
            const data: ReminderLogsResponse = await response.json();

            if (data.success) {
                setLogs(data.data.logs);
                setPagination(data.data.pagination);
                setStatistics(data.data.statistics);
            }
        } catch (error) {
            console.error('Error fetching reminder logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [pagination.page, statusFilter, reminderTypeFilter, startDate, endDate]);

    const handleSearch = () => {
        setPagination({ ...pagination, page: 1 });
        fetchLogs();
    };

    const getStatusBadge = (status: string) => {
        const badges = {
            PENDING: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" />Pending</span>,
            SENT: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" />Sent</span>,
            FAILED: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" />Failed</span>,
            CANCELLED: <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Cancelled</span>,
        };
        return badges[status as keyof typeof badges] || <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">{status}</span>;
    };

    const getReminderTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            'H-5': 'bg-blue-100 text-blue-800',
            'H-2': 'bg-yellow-100 text-yellow-800',
            'H-0': 'bg-orange-100 text-orange-800',
            'D+1': 'bg-red-100 text-red-800',
            'D+2': 'bg-red-200 text-red-900',
            'D+5': 'bg-red-300 text-red-950',
        };
        return (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
                {type}
            </span>
        );
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

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    <Bell className="w-6 h-6" />
                    Reminder Logs
                </h2>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-500">Total</div>
                    <div className="text-2xl font-bold">{statistics.total}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-500">Pending</div>
                    <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-500">Sent</div>
                    <div className="text-2xl font-bold text-green-600">{statistics.sent}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-500">Failed</div>
                    <div className="text-2xl font-bold text-red-600">{statistics.failed}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-500">Cancelled</div>
                    <div className="text-2xl font-bold text-gray-600">{statistics.cancelled}</div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow">
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All</option>
                            <option value="PENDING">Pending</option>
                            <option value="SENT">Sent</option>
                            <option value="FAILED">Failed</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Type</label>
                        <select
                            value={reminderTypeFilter}
                            onChange={(e) => setReminderTypeFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">All</option>
                            <option value="H-5">H-5</option>
                            <option value="H-2">H-2</option>
                            <option value="H-0">H-0</option>
                            <option value="D+1">D+1</option>
                            <option value="D+2">D+2</option>
                            <option value="D+5">D+5</option>
                        </select>
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
                            setStatusFilter('');
                            setReminderTypeFilter('');
                            setStartDate('');
                            setEndDate('');
                            setCustomerName('');
                            setInvoiceNumber('');
                            setPagination({ ...pagination, page: 1 });
                            fetchLogs();
                        }}
                        className="ml-2 inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : logs.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No reminder logs found</div>
                ) : (
                    <>
                        <div className="relative overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Date</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Type</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Customer</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Invoice</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Amount</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Status</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Sent Via</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Sent At</th>
                                        <th className="sticky top-0 bg-gray-50 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider z-10">Retries</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(log.scheduledAt)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getReminderTypeBadge(log.reminderType)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{log.customer.name}</div>
                                                <div className="text-sm text-gray-500">{log.customer.phone}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{log.invoice.invoiceNumber || 'N/A'}</div>
                                                <div className="text-sm text-gray-500">Due: {formatDate(log.invoice.dueDate)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatCurrency(log.invoice.amount)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(log.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col gap-1">
                                                    {log.emailSent && (
                                                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                                            <Mail className="w-3 h-3 mr-1" />
                                                            Email
                                                        </span>
                                                    )}
                                                    {log.whatsappSent && (
                                                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                            <MessageSquare className="w-3 h-3 mr-1" />
                                                            WhatsApp
                                                        </span>
                                                    )}
                                                    {!log.emailSent && !log.whatsappSent && log.status === 'SENT' && (
                                                        <span className="text-xs text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.sentAt ? formatDate(log.sentAt) : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {log.retryCount > 0 && (
                                                    <div>
                                                        <span className="text-sm text-gray-900">{log.retryCount}</span>
                                                        {log.lastError && (
                                                            <div className="text-xs text-red-600 mt-1" title={log.lastError}>
                                                                Error
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
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
                                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                                                pagination.page === page
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
        </div>
    );
}

