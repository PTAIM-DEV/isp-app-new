import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DollarSign } from 'lucide-react';

export const dynamic = 'force-dynamic';

async function getResellerId() {
  const cookieStore = await cookies();
  const session = cookieStore.get('reseller_session');
  
  if (!session) {
    return null;
  }

  const sessions = await prisma.systemSetting.findMany({
    where: {
      key: { startsWith: 'reseller_session_' }
    }
  });

  for (const sessionData of sessions) {
    try {
      const { token } = JSON.parse(sessionData.value);
      if (token === session.value) {
        const resellerId = sessionData.key.replace('reseller_session_', '');
        const user = await prisma.user.findUnique({
          where: { id: resellerId },
          select: { id: true, role: true, status: true }
        });

        if (user && user.role === 'RESELLER' && user.status === 'ACTIVE') {
          return resellerId;
        }
      }
    } catch (e) {
      // Skip invalid session data
    }
  }

  return null;
}

export default async function ResellerSalesPage() {
  const resellerId = await getResellerId();
  
  if (!resellerId) {
    redirect('/reseller-login');
  }

  const sales = await prisma.voucherSale.findMany({
    where: {
      resellerUserId: resellerId
    },
    include: {
      voucher: {
        select: {
          code: true
        }
      },
      package: {
        select: {
          name: true
        }
      },
      server: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100
  });

  const totals = await prisma.voucherSale.aggregate({
    where: {
      resellerUserId: resellerId
    },
    _sum: {
      totalAmount: true,
      quantity: true
    },
    _count: true
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Penjualan</h2>
        <p className="text-gray-500 mt-1">Riwayat penjualan voucher Anda</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Penjualan</p>
              <p className="text-2xl font-bold text-indigo-600">
                Rp {Number(totals._sum.totalAmount || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Voucher Terjual</p>
              <p className="text-2xl font-bold text-green-600">
                {totals._sum.quantity || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Transaksi</p>
              <p className="text-2xl font-bold text-blue-600">
                {totals._count || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {sales.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Belum ada penjualan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Voucher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Server</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {sale.voucher.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.package?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.server.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      Rp {Number(sale.totalAmount).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        sale.paymentStatus === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : sale.paymentStatus === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

