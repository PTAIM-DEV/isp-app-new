import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Wifi, Plus, Search, Filter } from 'lucide-react';
import VoucherList from './voucher-list';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    serverId?: string;
    status?: string;
    code?: string;
    page?: string;
  }>;
}

export default async function VouchersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const serverId = params.serverId;
  const status = params.status;
  const code = params.code;
  const page = parseInt(params.page || '1');
  const limit = 50;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (serverId) where.serverId = serverId;
  if (status) where.status = status;
  if (code) where.code = { contains: code, mode: 'insensitive' };

  const [vouchers, total, servers, serverStatuses] = await Promise.all([
    prisma.hotspotVoucher.findMany({
      where,
      include: {
        server: {
          select: {
            id: true,
            name: true,
            connectionStatus: true,
            lastConnected: true,
            errorMessage: true
          }
        },
        package: {
          select: {
            id: true,
            name: true,
            duration: true
          }
        },
        resellerUser: {
          select: {
            id: true,
            name: true
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
      skip,
      take: limit
    }),
    prisma.hotspotVoucher.count({ where }),
    prisma.mikrotikServer.findMany({
      where: { isActive: true },
      select: { 
        id: true, 
        name: true,
        connectionStatus: true,
        lastConnected: true,
        errorMessage: true
      },
      orderBy: { name: 'asc' }
    }),
    prisma.mikrotikServer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        connectionStatus: true,
        lastConnected: true,
        errorMessage: true
      },
      orderBy: { name: 'asc' }
    })
  ]);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Hotspot Vouchers</h2>
          <p className="text-gray-500 mt-1">Kelola voucher hotspot</p>
        </div>
        <Link
          href="/admin/hotspot/vouchers/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Buat Voucher Baru
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Server
            </label>
            <select
              name="serverId"
              defaultValue={serverId || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Server</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              name="status"
              defaultValue={status || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Status</option>
              <option value="UNUSED">Unused</option>
              <option value="ACTIVE">Active</option>
              <option value="USED">Used</option>
              <option value="EXPIRED">Expired</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cari Kode
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input
                type="text"
                name="code"
                defaultValue={code || ''}
                placeholder="Cari kode voucher..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Filter className="w-4 h-4 inline mr-2" />
              Filter
            </button>
          </div>
        </form>
      </div>

      {/* Voucher List */}
      <VoucherList 
        vouchers={vouchers.map(voucher => ({
          ...voucher,
          price: Number(voucher.price)
        }))} 
        total={total} 
        page={page} 
        limit={limit}
        servers={servers}
        serverStatuses={serverStatuses.map(s => ({
          id: s.id,
          name: s.name,
          connectionStatus: s.connectionStatus as 'CONNECTED' | 'DISCONNECTED' | 'ERROR',
          lastConnected: s.lastConnected,
          errorMessage: s.errorMessage
        }))}
        selectedServerId={serverId}
      />
    </div>
  );
}

