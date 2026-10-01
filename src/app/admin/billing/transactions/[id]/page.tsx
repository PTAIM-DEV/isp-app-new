import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, FileText, User, DollarSign, CreditCard, Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TransactionDetailPage({ params }: PageProps) {
    const { id } = await params;

    const transaction = await prisma.paymentTransaction.findUnique({
        where: { id },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                },
            },
            invoice: {
                select: {
                    id: true,
                    invoiceNumber: true,
                    amount: true,
                    status: true,
                    dueDate: true,
                    createdAt: true,
                    description: true,
                },
            },
        },
    });

    if (!transaction) {
        return (
            <div className="p-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Transaksi Tidak Ditemukan</h2>
                    <p className="text-gray-600 mb-4">Transaksi dengan ID tersebut tidak ditemukan.</p>
                    <Link href="/admin/billing/transactions" className="text-indigo-600 hover:text-indigo-900">
                        &larr; Kembali ke Riwayat Transaksi
                    </Link>
                </div>
            </div>
        );
    }

    // Parse raw response if available
    let rawResponseData: any = null;
    if (transaction.rawResponse) {
        try {
            rawResponseData = JSON.parse(transaction.rawResponse);
        } catch (e) {
            // If parsing fails, keep as null
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const getStatusBadge = (status: string) => {
        const baseClasses = "px-3 py-1 inline-flex items-center text-sm font-semibold rounded-full";
        switch (status) {
            case 'PAID':
                return (
                    <span className={`${baseClasses} bg-green-100 text-green-800`}>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        PAID
                    </span>
                );
            case 'EXPIRED':
                return (
                    <span className={`${baseClasses} bg-red-100 text-red-800`}>
                        <XCircle className="w-4 h-4 mr-1" />
                        EXPIRED
                    </span>
                );
            case 'FAILED':
                return (
                    <span className={`${baseClasses} bg-red-100 text-red-800`}>
                        <XCircle className="w-4 h-4 mr-1" />
                        FAILED
                    </span>
                );
            default:
                return (
                    <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
                        <Clock className="w-4 h-4 mr-1" />
                        {status}
                    </span>
                );
        }
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <Link 
                    href="/admin/billing/transactions" 
                    className="inline-flex items-center text-indigo-600 hover:text-indigo-900 mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kembali ke Riwayat Transaksi
                </Link>
                <h1 className="text-3xl font-bold text-gray-900">Detail Transaksi</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Transaction Information */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <DollarSign className="w-5 h-5 mr-2 text-indigo-600" />
                            Informasi Transaksi
                        </h2>
                    </div>
                    <div className="px-6 py-4 space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500">Status</label>
                            <div className="mt-1">
                                {getStatusBadge(transaction.status)}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Jumlah</label>
                            <div className="mt-1 text-2xl font-bold text-gray-900">
                                {formatCurrency(Number(transaction.amount))}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Tanggal Transaksi</label>
                            <div className="mt-1 text-sm text-gray-900 flex items-center">
                                <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                {formatDate(transaction.createdAt)}
                            </div>
                        </div>
                        {transaction.paidAt && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Tanggal Dibayar</label>
                                <div className="mt-1 text-sm text-gray-900 flex items-center">
                                    <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                                    {formatDate(transaction.paidAt)}
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="text-sm font-medium text-gray-500">Metode Pembayaran</label>
                            <div className="mt-1 text-sm text-gray-900 flex items-center">
                                <CreditCard className="w-4 h-4 mr-2 text-gray-400" />
                                {transaction.paymentMethod || '-'}
                                {transaction.paymentChannel && ` (${transaction.paymentChannel})`}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">Xendit ID</label>
                            <div className="mt-1 text-sm text-gray-900 font-mono">
                                {transaction.xenditId}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500">External ID</label>
                            <div className="mt-1 text-sm text-gray-900 font-mono">
                                {transaction.externalId}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Customer Information */}
                {transaction.user && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <User className="w-5 h-5 mr-2 text-indigo-600" />
                                Informasi Pelanggan
                            </h2>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500">Nama</label>
                                <div className="mt-1 text-sm text-gray-900">
                                    <Link 
                                        href={`/admin/customers/${transaction.user.id}`}
                                        className="text-indigo-600 hover:text-indigo-900 hover:underline"
                                    >
                                        {transaction.user.name}
                                    </Link>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Telepon</label>
                                <div className="mt-1 text-sm text-gray-900">{transaction.user.phone}</div>
                            </div>
                            {transaction.user.email && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Email</label>
                                    <div className="mt-1 text-sm text-gray-900">{transaction.user.email}</div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Invoice Information */}
                {transaction.invoice && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                                <FileText className="w-5 h-5 mr-2 text-indigo-600" />
                                Informasi Invoice
                            </h2>
                        </div>
                        <div className="px-6 py-4 space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-500">Invoice Number</label>
                                <div className="mt-1 text-sm text-gray-900">
                                    {transaction.invoice.invoiceNumber || `#${transaction.invoice.id.slice(-6).toUpperCase()}`}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Jumlah Invoice</label>
                                <div className="mt-1 text-sm font-semibold text-gray-900">
                                    {formatCurrency(Number(transaction.invoice.amount))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Status Invoice</label>
                                <div className="mt-1">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                        transaction.invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                        transaction.invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {transaction.invoice.status}
                                    </span>
                                </div>
                            </div>
                            {transaction.invoice.description && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500">Deskripsi</label>
                                    <div className="mt-1 text-sm text-gray-900">{transaction.invoice.description}</div>
                                </div>
                            )}
                            <div>
                                <label className="text-sm font-medium text-gray-500">Tanggal Jatuh Tempo</label>
                                <div className="mt-1 text-sm text-gray-900">
                                    {formatDate(transaction.invoice.dueDate)}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-500">Tanggal Dibuat</label>
                                <div className="mt-1 text-sm text-gray-900">
                                    {formatDate(transaction.invoice.createdAt)}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Raw Response Data */}
                {rawResponseData && (
                    <div className="bg-white rounded-lg shadow lg:col-span-2">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Raw Response Data (Xendit)</h2>
                        </div>
                        <div className="px-6 py-4">
                            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs text-gray-800 font-mono">
                                {JSON.stringify(rawResponseData, null, 2)}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

