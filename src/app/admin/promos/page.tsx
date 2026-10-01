import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PromosPage() {
    const promos = await prisma.promo.findMany({
        orderBy: { createdAt: 'desc' },
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Promo Codes</h2>
                <Link
                    href="/admin/promos/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    + Tambah Promo
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Kode
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Nama
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Tipe / Nilai
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Validitas
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Penggunaan
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Aksi
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {promos.map((promo) => {
                            const isValid = new Date() >= new Date(promo.validFrom) && 
                                (!promo.validUntil || new Date() <= new Date(promo.validUntil));
                            const isMaxUsed = promo.maxUses && promo.usedCount >= promo.maxUses;

                            return (
                                <tr key={promo.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900 font-mono">{promo.code}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm text-gray-900">{promo.name}</div>
                                        {promo.description && (
                                            <div className="text-xs text-gray-500 mt-1">{promo.description}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {promo.type === 'DISCOUNT_PERCENT' && `${promo.value}%`}
                                            {promo.type === 'DISCOUNT_AMOUNT' && `Rp ${Number(promo.value || 0).toLocaleString('id-ID')}`}
                                            {promo.type === 'FREE_INSTALLATION' && 'Gratis Instalasi'}
                                            {promo.type === 'BONUS_MONTHS' && `${promo.value} Bulan Bonus`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <div>{formatDate(promo.validFrom)}</div>
                                        {promo.validUntil && (
                                            <div className="text-xs">s/d {formatDate(promo.validUntil)}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {promo.usedCount} / {promo.maxUses || '∞'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                            promo.isActive && isValid && !isMaxUsed 
                                                ? 'bg-green-100 text-green-800' 
                                                : 'bg-gray-100 text-gray-800'
                                        }`}>
                                            {promo.isActive && isValid && !isMaxUsed ? 'Aktif' : 'Nonaktif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/admin/promos/${promo.id}`} className="text-indigo-600 hover:text-indigo-900">
                                            Detail
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                        {promos.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                    Belum ada promo code. <Link href="/admin/promos/new" className="text-indigo-600 hover:text-indigo-900">Buat yang pertama</Link>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


