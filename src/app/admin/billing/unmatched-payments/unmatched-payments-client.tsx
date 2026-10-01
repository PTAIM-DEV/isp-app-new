'use client';

import { useState, useTransition } from 'react';
import { Search, Link2, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { searchInvoices, matchPaymentWithInvoice } from './actions';

interface PaymentTransaction {
    id: string;
    xenditId: string;
    externalId: string;
    amount: number;
    status: string;
    paymentMethod: string | null;
    paymentChannel: string | null;
    paidAt: Date | null;
    createdAt: Date;
    user: {
        id: string;
        name: string;
        email: string | null;
        phone: string;
    } | null;
}

interface Invoice {
    id: string;
    invoiceNumber: string | null;
    amount: number;
    status: string;
    dueDate: Date;
    user: {
        id: string;
        name: string;
        email: string | null;
        phone: string;
    };
}

interface UnmatchedPaymentsClientProps {
    initialPayments: PaymentTransaction[];
}

export function UnmatchedPaymentsClient({ initialPayments }: UnmatchedPaymentsClientProps) {
    const [payments, setPayments] = useState(initialPayments);
    const [selectedPayment, setSelectedPayment] = useState<PaymentTransaction | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Invoice[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isMatching, startMatching] = useTransition();
    const [matchResult, setMatchResult] = useState<{ success: boolean; error?: string; warning?: string } | null>(null);

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (query.trim().length < 2) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const result = await searchInvoices(query);
        setIsSearching(false);

        if (result.success && result.invoices) {
            setSearchResults(result.invoices);
        } else {
            setSearchResults([]);
        }
    };

    const handleMatch = async (paymentId: string, invoiceId: string) => {
        setMatchResult(null);
        startMatching(async () => {
            const result = await matchPaymentWithInvoice(paymentId, invoiceId);
            setMatchResult(result);

            if (result.success) {
                // Remove matched payment from list
                setPayments(payments.filter(p => p.id !== paymentId));
                setSelectedPayment(null);
                setSearchQuery('');
                setSearchResults([]);
            }
        });
    };

    const formatCurrency = (amount: number) => {
        return `Rp ${amount.toLocaleString('id-ID')}`;
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sync Manual Payment</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Match payment notifications dari Xendit dengan invoice yang ada
                    </p>
                </div>
            </div>

            {matchResult && (
                <div
                    className={`p-4 rounded-lg ${
                        matchResult.success
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                    }`}
                >
                    <div className="flex items-start">
                        {matchResult.success ? (
                            <CheckCircle2 className="w-5 h-5 mr-2 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 mr-2 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <p className="font-semibold">
                                {matchResult.success ? 'Berhasil di-match!' : 'Gagal match'}
                            </p>
                            {matchResult.error && <p className="text-sm mt-1">{matchResult.error}</p>}
                            {matchResult.warning && (
                                <p className="text-sm mt-1 text-yellow-700">{matchResult.warning}</p>
                            )}
                        </div>
                        <button
                            onClick={() => setMatchResult(null)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Unmatched Payments List */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">
                        Unmatched Payments ({payments.length})
                    </h2>

                    {payments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-500" />
                            <p>Semua payment sudah di-match!</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[600px] overflow-y-auto">
                            {payments.map((payment) => (
                                <div
                                    key={payment.id}
                                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                                        selectedPayment?.id === payment.id
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    onClick={() => {
                                        setSelectedPayment(payment);
                                        setSearchQuery('');
                                        setSearchResults([]);
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-semibold text-gray-900">
                                                    {formatCurrency(Number(payment.amount))}
                                                </span>
                                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                                                    {payment.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <p>
                                                    <span className="font-medium">Xendit ID:</span>{' '}
                                                    <code className="text-xs">{payment.xenditId}</code>
                                                </p>
                                                {payment.externalId && (
                                                    <p>
                                                        <span className="font-medium">External ID:</span>{' '}
                                                        <code className="text-xs">{payment.externalId}</code>
                                                    </p>
                                                )}
                                                {payment.paymentMethod && (
                                                    <p>
                                                        <span className="font-medium">Method:</span>{' '}
                                                        {payment.paymentMethod}
                                                        {payment.paymentChannel && ` (${payment.paymentChannel})`}
                                                    </p>
                                                )}
                                                <p>
                                                    <span className="font-medium">Paid At:</span>{' '}
                                                    {formatDate(payment.paidAt)}
                                                </p>
                                                {payment.user && (
                                                    <p>
                                                        <span className="font-medium">User:</span>{' '}
                                                        {payment.user.name} ({payment.user.phone})
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Search and Match */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-4">
                        {selectedPayment ? 'Cari Invoice untuk Match' : 'Pilih Payment Terlebih Dahulu'}
                    </h2>

                    {selectedPayment ? (
                        <div className="space-y-4">
                            {/* Selected Payment Info */}
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Payment yang dipilih:</p>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <p>
                                        <span className="font-medium">Amount:</span>{' '}
                                        {formatCurrency(Number(selectedPayment.amount))}
                                    </p>
                                    <p>
                                        <span className="font-medium">Paid At:</span>{' '}
                                        {formatDate(selectedPayment.paidAt)}
                                    </p>
                                    {selectedPayment.user && (
                                        <p>
                                            <span className="font-medium">User:</span>{' '}
                                            {selectedPayment.user.name} ({selectedPayment.user.phone})
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Search Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Cari Invoice (No. Invoice, Nama, Phone, Email)
                                </label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => handleSearch(e.target.value)}
                                        placeholder="Masukkan nomor invoice, nama, atau phone..."
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                    />
                                </div>
                            </div>

                            {/* Search Results */}
                            {isSearching && (
                                <div className="text-center py-4 text-gray-500">
                                    <p>Mencari...</p>
                                </div>
                            )}

                            {!isSearching && searchResults.length > 0 && (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                    <p className="text-sm font-medium text-gray-700">
                                        Hasil Pencarian ({searchResults.length})
                                    </p>
                                    {searchResults.map((invoice) => {
                                        const amountMatch =
                                            Math.abs(Number(invoice.amount) - Number(selectedPayment.amount)) < 1000;
                                        return (
                                            <div
                                                key={invoice.id}
                                                className={`border rounded-lg p-4 ${
                                                    amountMatch
                                                        ? 'border-green-200 bg-green-50'
                                                        : 'border-yellow-200 bg-yellow-50'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className="font-semibold text-gray-900">
                                                                {invoice.invoiceNumber || 'N/A'}
                                                            </span>
                                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                                {invoice.status}
                                                            </span>
                                                            {!amountMatch && (
                                                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                                                                    Amount berbeda
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-sm text-gray-600 space-y-1">
                                                            <p>
                                                                <span className="font-medium">Amount:</span>{' '}
                                                                {formatCurrency(Number(invoice.amount))}
                                                                {!amountMatch && (
                                                                    <span className="text-yellow-700 ml-2">
                                                                        (Selisih:{' '}
                                                                        {formatCurrency(
                                                                            Math.abs(
                                                                                Number(invoice.amount) -
                                                                                    Number(selectedPayment.amount)
                                                                            )
                                                                        )}
                                                                        )
                                                                    </span>
                                                                )}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Due Date:</span>{' '}
                                                                {formatDate(invoice.dueDate)}
                                                            </p>
                                                            <p>
                                                                <span className="font-medium">Customer:</span>{' '}
                                                                {invoice.user.name} ({invoice.user.phone})
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleMatch(selectedPayment.id, invoice.id)}
                                                        disabled={isMatching}
                                                        className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        <Link2 className="w-4 h-4 mr-2" />
                                                        {isMatching ? 'Matching...' : 'Match'}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {!isSearching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                <div className="text-center py-8 text-gray-500">
                                    <p>Invoice tidak ditemukan</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-gray-500">
                            <AlertCircle className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                            <p>Pilih payment dari daftar di sebelah kiri untuk mulai mencari invoice</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

