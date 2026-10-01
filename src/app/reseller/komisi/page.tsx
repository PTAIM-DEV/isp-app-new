import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { TrendingUp } from 'lucide-react';

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

export default async function ResellerKomisiPage() {
  const resellerId = await getResellerId();
  
  if (!resellerId) {
    redirect('/reseller-login');
  }

  const [records, stats] = await Promise.all([
    prisma.komisiRecord.findMany({
      where: {
        resellerUserId: resellerId
      },
      include: {
        sale: {
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
          }
        },
        rule: {
          select: {
            name: true,
            komisiType: true,
            komisiValue: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    }),
    prisma.komisiRecord.aggregate({
      where: {
        resellerUserId: resellerId
      },
      _sum: {
        komisiAmount: true
      },
      _count: true
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
        <h2 className="text-2xl font-bold">Komisi</h2>
        <p className="text-gray-500 mt-1">Riwayat komisi penjualan Anda</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Komisi</p>
              <p className="text-2xl font-bold text-indigo-600">
                Rp {Number(stats._sum.komisiAmount || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-indigo-600" />
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
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Komisi Dibayar</p>
              <p className="text-2xl font-bold text-green-600">
                Rp {Number(paidKomisi._sum.komisiAmount || 0).toLocaleString('id-ID')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Komisi Records */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {records.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Belum ada komisi
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Voucher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rule Komisi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Komisi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {record.sale.voucher.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.sale.package?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div>{record.rule?.name || '-'}</div>
                        <div className="text-xs text-gray-500">
                          {record.rule?.komisiType === 'PERCENTAGE' 
                            ? `${record.rule.komisiValue}%`
                            : record.rule ? `Rp ${Number(record.rule.komisiValue).toLocaleString('id-ID')}` : '-'
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      Rp {Number(record.komisiAmount).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        record.status === 'PAID'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {record.status}
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

