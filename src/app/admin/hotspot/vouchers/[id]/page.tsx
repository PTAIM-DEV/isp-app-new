import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Wifi, Copy, Send, Trash2, CheckCircle, XCircle, Clock, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function VoucherDetailPage({ params }: PageProps) {
  const { id } = await params;

  const voucher = await prisma.hotspotVoucher.findUnique({
    where: { id },
    include: {
      server: {
        select: {
          id: true,
          name: true,
          host: true
        }
      },
      package: {
        select: {
          id: true,
          name: true,
          duration: true,
          price: true,
          downloadSpeed: true,
          uploadSpeed: true
        }
      },
      resellerUser: {
        select: {
          id: true,
          name: true
        }
      },
      sessions: {
        take: 10,
        orderBy: { startTime: 'desc' },
        select: {
          id: true,
          startTime: true,
          stopTime: true,
          status: true,
          ipAddress: true,
          macAddress: true
        }
      },
      _count: {
        select: {
          sessions: true
        }
      }
    }
  });

  if (!voucher) {
    notFound();
  }

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'EXPIRED':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'USED':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Detail Voucher</h2>
          <p className="text-gray-500 mt-1">Informasi lengkap voucher hotspot</p>
        </div>
        <div className="flex space-x-2">
          <Link
            href="/admin/hotspot/vouchers"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            Kembali
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Voucher Code */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Kode Voucher</h3>
              <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(voucher.status)}`}>
                {voucher.status}
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {getStatusIcon(voucher.status)}
              <div className="flex-1">
                <p className="text-2xl font-mono font-bold text-gray-900">{voucher.code}</p>
                {voucher.username && (
                  <div className="mt-2 flex items-center space-x-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      <span>User: {voucher.username}</span>
                    </div>
                    {voucher.password && (
                      <div>
                        <span>Pass: {voucher.password}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Package & Server Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Informasi Paket & Server</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Server</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <Link href={`/admin/hotspot/servers/${voucher.server.id}`} className="text-indigo-600 hover:text-indigo-700">
                    {voucher.server.name}
                  </Link>
                </dd>
              </div>
              {voucher.package && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Paket</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link href={`/admin/hotspot/packages/${voucher.package.id}/edit`} className="text-indigo-600 hover:text-indigo-700">
                      {voucher.package.name}
                    </Link>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Masa Berlaku Voucher</dt>
                <dd className="mt-1 text-sm text-gray-900">{voucher.duration} menit</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Kuota Waktu (limit-uptime)</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {voucher.limitUptime || '-'}
                  <p className="text-xs text-gray-500">Batas total waktu koneksi (akumulatif). Saat kuota habis, Mikrotik otomatis logout.</p>
                </dd>
              </div>
              {voucher.package && (voucher.package.downloadSpeed || voucher.package.uploadSpeed) && (
                <>
                  {voucher.package.downloadSpeed && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Download Speed</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-semibold">
                        {voucher.package.downloadSpeed}
                      </dd>
                    </div>
                  )}
                  {voucher.package.uploadSpeed && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Upload Speed</dt>
                      <dd className="mt-1 text-sm text-gray-900 font-semibold">
                        {voucher.package.uploadSpeed}
                      </dd>
                    </div>
                  )}
                </>
              )}
              <div>
                <dt className="text-sm font-medium text-gray-500">Harga</dt>
                <dd className="mt-1 text-sm text-gray-900 font-semibold">
                  Rp {Number(voucher.price).toLocaleString('id-ID')}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Sesi</dt>
                <dd className="mt-1 text-sm text-gray-900">{voucher._count.sessions} sesi</dd>
              </div>
            </dl>
          </div>

          {/* Code Generation Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Pengaturan Kode</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Prefix</dt>
                <dd className="mt-1 text-sm text-gray-900">{voucher.prefix || '-'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Panjang Kode</dt>
                <dd className="mt-1 text-sm text-gray-900">{voucher.codeLength} karakter</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Kombinasi</dt>
                <dd className="mt-1 text-sm text-gray-900">{voucher.combination}</dd>
              </div>
            </dl>
          </div>

          {/* Recent Sessions */}
          {voucher.sessions.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Sesi Terbaru</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu Mulai</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waktu Selesai</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {voucher.sessions.map((session) => (
                      <tr key={session.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {new Date(session.startTime).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {session.stopTime ? new Date(session.stopTime).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {session.ipAddress || '-'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            session.status === 'ACTIVE' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {session.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Timestamps */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Timeline</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Dibuat</p>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(voucher.createdAt).toLocaleString('id-ID')}
                </p>
              </div>
              {voucher.activatedAt && (
                <div>
                  <p className="text-sm text-gray-500">Diaktifkan</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(voucher.activatedAt).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
              {voucher.expiresAt && (
                <div>
                  <p className="text-sm text-gray-500">Kedaluwarsa</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(voucher.expiresAt).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
              {voucher.lastUsedAt && (
                <div>
                  <p className="text-sm text-gray-500">Terakhir Digunakan</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(voucher.lastUsedAt).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* MikroTik Sync Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Status Sync MikroTik</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status Sync</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  voucher.syncedToMikrotik 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {voucher.syncedToMikrotik ? 'Tersinkron' : 'Belum Tersinkron'}
                </span>
              </div>
              {voucher.syncedAt && (
                <div>
                  <p className="text-sm text-gray-500">Waktu Sync</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(voucher.syncedAt).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
              {voucher.mikrotikUserId && (
                <div>
                  <p className="text-sm text-gray-500">MikroTik User ID</p>
                  <p className="text-sm font-medium text-gray-900 font-mono">{voucher.mikrotikUserId}</p>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium mb-4">Status WhatsApp</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status Kirim</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  voucher.whatsappSent 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {voucher.whatsappSent ? 'Terkirim' : 'Belum Terkirim'}
                </span>
              </div>
              {voucher.whatsappSentAt && (
                <div>
                  <p className="text-sm text-gray-500">Waktu Kirim</p>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(voucher.whatsappSentAt).toLocaleString('id-ID')}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Reseller Info */}
          {voucher.resellerUser && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-medium mb-4">Reseller</h3>
              <p className="text-sm font-medium text-gray-900">{voucher.resellerUser.name}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

