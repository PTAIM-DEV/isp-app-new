import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
    const transactions = await prisma.paymentTransaction.findMany({
        include: {
            user: true,
            invoice: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    // Count transactions with and without invoice
    const withInvoice = transactions.filter(tx => tx.invoiceId !== null).length;
    const withoutInvoice = transactions.filter(tx => tx.invoiceId === null && tx.status === 'PAID').length;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold">Riwayat Transaksi</h2>
                    <p className="text-gray-600 mt-1">Semua transaksi pembayaran yang diterima</p>
                </div>
                <div className="flex gap-2">
                    <Link 
                        href="/admin/billing/revenue-report" 
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Lihat di Laporan Revenue
                    </Link>
                    <Link href="/admin/billing" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        &larr; Kembali ke Billing
                    </Link>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-indigo-500">
                    <div className="text-sm text-gray-500 mb-1">Total Transaksi</div>
                    <div className="text-2xl font-bold text-indigo-600">{transactions.length}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
                    <div className="text-sm text-gray-500 mb-1">Dengan Invoice</div>
                    <div className="text-2xl font-bold text-green-600">{withInvoice}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
                    <div className="text-sm text-gray-500 mb-1">Sistem Lama (Tanpa Invoice)</div>
                    <div className="text-2xl font-bold text-yellow-600">{withoutInvoice}</div>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tanggal
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
                                Status
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Invoice
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {transactions.map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <Link 
                                        href={`/admin/billing/transactions/${tx.id}`}
                                        className="hover:text-indigo-600 hover:underline"
                                    >
                                        {formatDate(tx.createdAt)}
                                    </Link>
                                    <div className="text-xs text-gray-400">{tx.xenditId}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {tx.user ? (
                                        <>
                                            <div className="text-sm font-medium text-gray-900">{tx.user.name}</div>
                                            <div className="text-xs text-gray-500">{tx.user.phone}</div>
                                        </>
                                    ) : (
                                        <span className="text-sm text-gray-500">-</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    <Link 
                                        href={`/admin/billing/transactions/${tx.id}`}
                                        className="hover:text-indigo-600 hover:underline"
                                    >
                                        Rp {Number(tx.amount).toLocaleString('id-ID')}
                                    </Link>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {tx.paymentMethod} {tx.paymentChannel ? `(${tx.paymentChannel})` : ''}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tx.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                            tx.status === 'EXPIRED' ? 'bg-red-100 text-red-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {tx.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600">
                                    <Link 
                                        href={`/admin/billing/transactions/${tx.id}`}
                                        className="hover:text-indigo-900 hover:underline font-medium"
                                    >
                                        {tx.invoice ? (
                                            <span title={tx.invoice.invoiceNumber || ''}>
                                                #{tx.invoice.id.slice(-6).toUpperCase()}
                                            </span>
                                        ) : (
                                            'Lihat Detail'
                                        )}
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                                    Belum ada transaksi.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
