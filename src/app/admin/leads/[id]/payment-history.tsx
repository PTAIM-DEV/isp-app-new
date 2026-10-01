import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';

interface PaymentHistoryProps {
    userId: string;
}

export async function PaymentHistory({ userId }: PaymentHistoryProps) {
    const transactions = await prisma.paymentTransaction.findMany({
        where: { userId },
        include: {
            invoice: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    if (transactions.length === 0) {
        return null;
    }

    return (
        <div className="bg-white shadow sm:rounded-lg overflow-hidden mb-6">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Riwayat Pembayaran</h3>
            </div>
            <div className="border-t border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tanggal
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
                            <tr key={tx.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {formatDate(tx.createdAt)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    Rp {Number(tx.amount).toLocaleString('id-ID')}
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
                                    {tx.invoice ? (
                                        <span title={tx.invoice.invoiceNumber || ''}>
                                            #{tx.invoice.id.slice(-6).toUpperCase()}
                                        </span>
                                    ) : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
