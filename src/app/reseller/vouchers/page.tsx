import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Wifi } from 'lucide-react';

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

export default async function ResellerVouchersPage() {
  const resellerId = await getResellerId();
  
  if (!resellerId) {
    redirect('/reseller-login');
  }

  const vouchers = await prisma.hotspotVoucher.findMany({
    where: {
      resellerUserId: resellerId
    },
    include: {
      server: {
        select: {
          id: true,
          name: true
        }
      },
      package: {
        select: {
          id: true,
          name: true,
          duration: true
        }
      },
      _count: {
        select: {
          sessions: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 100
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNUSED':
        return 'bg-gray-100 text-gray-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'USED':
        return 'bg-blue-100 text-blue-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Vouchers Saya</h2>
          <p className="text-gray-500 mt-1">Daftar voucher yang Anda buat</p>
        </div>
      </div>

      {vouchers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Wifi className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada voucher</h3>
          <p className="text-gray-500 mb-4">Anda belum membuat voucher.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Voucher</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Server</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paket</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sesi</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dibuat</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {vouchers.map((voucher) => (
                  <tr key={voucher.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-sm">{voucher.code}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {voucher.server.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {voucher.package ? (
                        <div>
                          <div>{voucher.package.name}</div>
                          <div className="text-xs text-gray-500">{voucher.package.duration} menit</div>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Rp {Number(voucher.price).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(voucher.status)}`}>
                        {voucher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voucher._count.sessions}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(voucher.createdAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

