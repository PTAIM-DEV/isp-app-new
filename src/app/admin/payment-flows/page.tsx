import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { deletePaymentFlow } from './actions';

export const dynamic = 'force-dynamic';

export default async function PaymentFlowsPage() {
    const paymentFlows = await prisma.paymentFlow.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            _count: {
                select: { assignedToUsers: true }
            }
        }
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Payment Flows</h2>
                <Link
                    href="/admin/payment-flows/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Tambah Flow
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-md">
                <ul className="divide-y divide-gray-200">
                    {paymentFlows.map((flow) => (
                        <li key={flow.id}>
                            <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-medium text-indigo-600 truncate">{flow.name}</h3>
                                        <p className="mt-1 text-sm text-gray-500">{flow.description}</p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${flow.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {flow.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                        <Link href={`/admin/payment-flows/${flow.id}/edit`} className="text-indigo-600 hover:text-indigo-900">
                                            <Edit className="h-5 w-5" />
                                        </Link>
                                        <form action={async () => {
                                            'use server';
                                            await deletePaymentFlow(flow.id);
                                        }}>
                                            <button
                                                type="submit"
                                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                disabled={flow._count.assignedToUsers > 0}
                                                title={flow._count.assignedToUsers > 0 ? "Tidak bisa dihapus karena sedang digunakan" : "Hapus Flow"}
                                            >
                                                <Trash2 className="h-5 w-5" />
                                            </button>
                                        </form>
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-gray-500 mr-6">
                                            Instalasi: {flow.requiresInstallationPayment
                                                ? (flow.freeInstallation ? 'Gratis (Promo)' : `Bayar Rp ${Number(flow.installationFeeAmount).toLocaleString('id-ID')}`)
                                                : 'Tidak Bayar'}
                                        </p>
                                        <p className="flex items-center text-sm text-gray-500 mr-6">
                                            Bulan Pertama: {flow.requiresFirstMonthPayment
                                                ? (flow.firstMonthPaymentAfterInstall ? 'Setelah Instalasi' : 'Wajib Bayar')
                                                : 'Tidak Bayar'}
                                        </p>
                                        <p className="flex items-center text-sm text-gray-500">
                                            Trial: {flow.supportsTrial ? `${flow.trialDays} Hari` : 'Tidak'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                    {paymentFlows.length === 0 && (
                        <li className="px-4 py-8 text-center text-gray-500">
                            Belum ada payment flow. Silakan buat baru.
                        </li>
                    )}
                </ul>
            </div>
        </div>
    );
}
