import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Server, Plus, Wifi, Users, Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HotspotServersPage() {
  const servers = await prisma.mikrotikServer.findMany({
    include: {
      subscription: {
        include: {
          tier: true
        }
      },
      _count: {
        select: {
          vouchers: true,
          packages: true,
          users: true,
          sessions: {
            where: {
              status: 'ACTIVE'
            }
          }
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return 'bg-green-100 text-green-800';
      case 'DISCONNECTED':
        return 'bg-gray-100 text-gray-800';
      case 'ERROR':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">MikroTik Servers</h2>
          <p className="text-gray-500 mt-1">Kelola server MikroTik untuk hotspot</p>
        </div>
        <Link
          href="/admin/hotspot/servers/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Tambah Server
        </Link>
      </div>

      {servers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Server className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada server</h3>
          <p className="text-gray-500 mb-4">Tambahkan server MikroTik pertama Anda untuk mulai menggunakan hotspot management.</p>
          <Link
            href="/admin/hotspot/servers/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tambah Server Pertama
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {servers.map((server) => (
            <div key={server.id} className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div className="p-3 bg-indigo-100 rounded-lg">
                      <Server className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-gray-900">{server.name}</h3>
                      <p className="text-sm text-gray-500">{server.host}:{server.port}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(server.connectionStatus)}`}>
                    {server.connectionStatus}
                  </span>
                </div>

                {server.description && (
                  <p className="text-sm text-gray-600 mb-4">{server.description}</p>
                )}

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Package className="w-4 h-4 mr-2" />
                    <span>{server._count.packages} Paket</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Wifi className="w-4 h-4 mr-2" />
                    <span>{server._count.vouchers} Voucher</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    <span>{server._count.users} User</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Wifi className="w-4 h-4 mr-2" />
                    <span>{server._count.sessions} Aktif</span>
                  </div>
                </div>

                {server.subscription && (
                  <div className="mb-4 p-2 bg-gray-50 rounded text-xs">
                    <span className="text-gray-600">Tier: </span>
                    <span className="font-medium">{server.subscription.tier.name}</span>
                  </div>
                )}

                <div className="flex space-x-2">
                  <Link
                    href={`/admin/hotspot/servers/${server.id}`}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100"
                  >
                    Detail
                  </Link>
                  <Link
                    href={`/admin/hotspot/servers/${server.id}/edit`}
                    className="flex-1 text-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-md hover:bg-gray-100"
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

