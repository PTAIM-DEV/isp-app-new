import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { DollarSign, Download, Calendar, Users, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LegacyTransactionsPage() {
    // Get transactions without invoice (from old system)
    const legacyTransactions = await prisma.paymentTransaction.findMany({
        where: {
            invoiceId: null,
            status: 'PAID', // Only show paid transactions
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                },
            },
        },
        orderBy: { paidAt: 'desc' },
    });

    // Calculate statistics
    const totalAmount = legacyTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalTransactions = legacyTransactions.length;
    const averageAmount = totalTransactions > 0 ? totalAmount / totalTransactions : 0;

    // Group by payment method
    const byPaymentMethod: Record<string, { count: number; total: number }> = {};
    legacyTransactions.forEach(tx => {
        const method = tx.paymentMethod || 'UNKNOWN';
        if (!byPaymentMethod[method]) {
            byPaymentMethod[method] = { count: 0, total: 0 };
        }
        byPaymentMethod[method].count += 1;
        byPaymentMethod[method].total += Number(tx.amount);
    });

    // Group by month
    const byMonth: Record<string, { count: number; total: number }> = {};
    legacyTransactions.forEach(tx => {
        if (tx.paidAt) {
            const monthKey = new Date(tx.paidAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long' });
            if (!byMonth[monthKey]) {
                byMonth[monthKey] = { count: 0, total: 0 };
            }
            byMonth[monthKey].count += 1;
            byMonth[monthKey].total += Number(tx.amount);
        }
    });

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
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <DollarSign className="w-6 h-6" />
                        Rekapan Pembayaran Sistem Lama
                    </h2>
                    <p className="text-gray-600 mt-1">Transaksi pembayaran yang diterima dari sistem lama (tanpa invoice)</p>
                </div>
                <Link 
                    href="/admin/billing/transactions" 
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                    &larr; Kembali ke Riwayat Transaksi
                </Link>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-2">Total Pembayaran</div>
                            <div className="text-3xl font-bold text-blue-600">{formatCurrency(totalAmount)}</div>
                        </div>
                        <DollarSign className="w-12 h-12 text-blue-200" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-2">Jumlah Transaksi</div>
                            <div className="text-3xl font-bold text-green-600">{totalTransactions}</div>
                        </div>
                        <Users className="w-12 h-12 text-green-200" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500 mb-2">Rata-rata per Transaksi</div>
                            <div className="text-3xl font-bold text-purple-600">{formatCurrency(averageAmount)}</div>
                        </div>
                        <TrendingUp className="w-12 h-12 text-purple-200" />
                    </div>
                </div>
            </div>

            {/* Breakdown by Payment Method */}
            {Object.keys(byPaymentMethod).length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold">Breakdown per Metode Pembayaran</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Metode Pembayaran</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah Transaksi</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Pembayaran</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rata-rata</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Object.entries(byPaymentMethod)
                                    .sort((a, b) => b[1].total - a[1].total)
                                    .map(([method, data]) => (
                                        <tr key={method}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {method}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                {data.count}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                                {formatCurrency(data.total)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                {formatCurrency(data.total / data.count)}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Breakdown by Month */}
            {Object.keys(byMonth).length > 0 && (
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Breakdown per Bulan
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bulan</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Jumlah Transaksi</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Pembayaran</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rata-rata</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Object.entries(byMonth)
                                    .sort((a, b) => {
                                        // Sort by date descending
                                        const dateA = new Date(a[0]);
                                        const dateB = new Date(b[0]);
                                        return dateB.getTime() - dateA.getTime();
                                    })
                                    .map(([month, data]) => (
                                        <tr key={month}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {month}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                {data.count}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                                                {formatCurrency(data.total)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                {formatCurrency(data.total / data.count)}
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Transactions Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold">Detail Transaksi</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tanggal Pembayaran
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Pelanggan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Jumlah
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Metode
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Channel
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Xendit ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    External ID
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {legacyTransactions.map((tx) => (
                                <tr key={tx.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {tx.paidAt ? formatDate(tx.paidAt) : formatDate(tx.createdAt)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {tx.user ? (
                                            <>
                                                <div className="text-sm font-medium text-gray-900">{tx.user.name}</div>
                                                <div className="text-xs text-gray-500">{tx.user.phone}</div>
                                                {tx.user.email && (
                                                    <div className="text-xs text-gray-400">{tx.user.email}</div>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {formatCurrency(Number(tx.amount))}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {tx.paymentMethod || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {tx.paymentChannel || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                                        {tx.xenditId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                                        {tx.externalId || '-'}
                                    </td>
                                </tr>
                            ))}
                            {legacyTransactions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                        Tidak ada transaksi dari sistem lama.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

