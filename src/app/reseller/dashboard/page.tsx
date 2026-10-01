import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { DollarSign, CreditCard, TrendingUp, Activity } from 'lucide-react';

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

export default async function ResellerDashboardPage() {
  const resellerId = await getResellerId();
  
  if (!resellerId) {
    redirect('/reseller-login');
    return null;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Fetch stats
  const [todayStats, monthStats, totalStats, komisiStats, recentSales] = await Promise.all([
    // Today's stats
    prisma.voucherSale.aggregate({
      where: {
        resellerUserId: resellerId,
        createdAt: { gte: todayStart }
      },
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    }),
    // This month's stats
    prisma.voucherSale.aggregate({
      where: {
        resellerUserId: resellerId,
        createdAt: { gte: monthStart }
      },
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    }),
    // Total stats
    prisma.voucherSale.aggregate({
      where: {
        resellerUserId: resellerId
      },
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    }),
    // Komisi stats
    prisma.komisiRecord.aggregate({
      where: {
        resellerUserId: resellerId
      },
      _sum: {
        komisiAmount: true
      },
      _count: true
    }),
    // Recent sales
    prisma.voucherSale.findMany({
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })
  ]);

  const pendingKomisi = await prisma.komisiRecord.aggregate({
    where: {
      resellerUserId: resellerId,
      status: 'PENDING'
    },
    _sum: {
      komisiAmount: true
    }
  });

  const paidKomisi = await prisma.komisiRecord.aggregate({
    where: {
      resellerUserId: resellerId,
      status: 'PAID'
    },
    _sum: {
      komisiAmount: true
    }
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-gray-500 mt-1">Ringkasan aktivitas penjualan Anda</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Penjualan Hari Ini</p>
              <p className="text-2xl font-bold text-indigo-600">
                Rp {Number(todayStats._sum.totalAmount || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {todayStats._count || 0} transaksi
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
              <p className="text-sm text-gray-500">Penjualan Bulan Ini</p>
              <p className="text-2xl font-bold text-green-600">
                Rp {Number(monthStats._sum.totalAmount || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {monthStats._count || 0} transaksi
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Activity className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Penjualan</p>
              <p className="text-2xl font-bold text-blue-600">
                Rp {Number(totalStats._sum.totalAmount || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {totalStats._count || 0} transaksi
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Komisi Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                Rp {Number(pendingKomisi._sum.komisiAmount || 0).toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Komisi Dibayar: Rp {Number(paidKomisi._sum.komisiAmount || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Penjualan Terbaru</h3>
        {recentSales.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Belum ada penjualan</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Voucher</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(sale.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900">
                      {sale.voucher.code}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {sale.package?.name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {sale.quantity}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                      Rp {Number(sale.totalAmount).toLocaleString('id-ID')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
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

