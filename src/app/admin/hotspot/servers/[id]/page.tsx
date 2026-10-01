import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Server, Edit, Package, Wifi, Users, Activity, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import SchedulerButton from './scheduler-button';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ServerDetailPage({ params }: PageProps) {
  const { id } = await params;

  const server = await prisma.mikrotikServer.findUnique({
    where: { id },
    include: {
      subscription: {
        include: {
          tier: true,
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      _count: {
        select: {
          packages: true,
          vouchers: true,
          users: true,
          sessions: {
            where: {
              status: 'ACTIVE'
            }
          }
        }
      },
      packages: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
          isActive: true
        }
      }
    }
  });

  if (!server) {
    notFound();
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CONNECTED':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

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
          <h2 className="text-2xl font-bold">{server.name}</h2>
          <p className="text-gray-500 mt-1">Detail server MikroTik</p>
        </div>
        <Link
          href={`/admin/hotspot/servers/${server.id}/edit`}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Edit className="w-5 h-5 mr-2" />
          Edit Server
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Status Koneksi</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {getStatusIcon(server.connectionStatus)}
                <div>
                  <p className="font-medium text-gray-900">{server.connectionStatus}</p>
                  {server.lastConnected && (
                    <p className="text-sm text-gray-500">
                      Terakhir terhubung: {new Date(server.lastConnected).toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              </div>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(server.connectionStatus)}`}>
                {server.connectionStatus}
              </span>
            </div>
            {server.errorMessage && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <strong>Error:</strong> {server.errorMessage}
              </div>
            )}
          </div>

          {/* Connection Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Informasi Koneksi</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Host / IP</dt>
                <dd className="mt-1 text-sm text-gray-900">{server.host}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Port</dt>
                <dd className="mt-1 text-sm text-gray-900">{server.port}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="mt-1 text-sm text-gray-900">{server.username}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">SSL/TLS</dt>
                <dd className="mt-1 text-sm text-gray-900">{server.useSSL ? 'Ya' : 'Tidak'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Timeout</dt>
                <dd className="mt-1 text-sm text-gray-900">{server.timeout} ms</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    server.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {server.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Hotspot Configuration */}
          {(server.hotspotProfile || server.hotspotInterface) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Konfigurasi Hotspot</h3>
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {server.hotspotProfile && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Hotspot Profile</dt>
                    <dd className="mt-1 text-sm text-gray-900">{server.hotspotProfile}</dd>
                  </div>
                )}
                {server.hotspotInterface && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Hotspot Interface</dt>
                    <dd className="mt-1 text-sm text-gray-900">{server.hotspotInterface}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Recent Packages */}
          {server.packages.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Paket Terbaru</h3>
                <Link
                  href={`/admin/hotspot/packages?serverId=${server.id}`}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  Lihat Semua
                </Link>
              </div>
              <div className="space-y-2">
                {server.packages.map((pkg) => (
                  <div key={pkg.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium text-gray-900">{pkg.name}</p>
                      <p className="text-sm text-gray-500">
                        {pkg.duration} menit • Rp {Number(pkg.price).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {pkg.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Statistik</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Package className="w-5 h-5 text-indigo-600 mr-2" />
                  <span className="text-sm text-gray-600">Paket</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{server._count.packages}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Wifi className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm text-gray-600">Voucher</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{server._count.vouchers}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Users className="w-5 h-5 text-blue-600 mr-2" />
                  <span className="text-sm text-gray-600">User</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{server._count.users}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Activity className="w-5 h-5 text-purple-600 mr-2" />
                  <span className="text-sm text-gray-600">Sesi Aktif</span>
                </div>
                <span className="text-lg font-semibold text-gray-900">{server._count.sessions}</span>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          {server.subscription && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Subscription</h3>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Tier</p>
                  <p className="font-medium text-gray-900">{server.subscription.tier.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">User</p>
                  <p className="font-medium text-gray-900">{server.subscription.user.name}</p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {server.description && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Deskripsi</h3>
              <p className="text-sm text-gray-600">{server.description}</p>
            </div>
          )}

          {/* Scheduler */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Expired Voucher Scheduler</h3>
            <SchedulerButton serverId={server.id} />
          </div>
        </div>
      </div>
    </div>
  );
}


