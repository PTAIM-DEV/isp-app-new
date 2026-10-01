import { prisma } from '@/lib/prisma';
import { DollarSign, TrendingUp, Package, Server } from 'lucide-react';
import SalesList from './sales-list';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    serverId?: string;
    resellerUserId?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const serverId = params.serverId;
  const resellerUserId = params.resellerUserId;
  const paymentStatus = params.paymentStatus;
  const startDate = params.startDate;
  const endDate = params.endDate;
  const page = parseInt(params.page || '1');
  const limit = 50;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (serverId) where.serverId = serverId;
  if (resellerUserId) where.resellerUserId = resellerUserId;
  if (paymentStatus) where.paymentStatus = paymentStatus;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) where.createdAt.lte = new Date(endDate);
  }

  const [sales, total, stats] = await Promise.all([
    prisma.voucherSale.findMany({
      where,
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
        },
        resellerUser: {
          select: {
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    }),
    prisma.voucherSale.count({ where }),
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/hotspot/sales/stats?${new URLSearchParams({
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
      ...(serverId && { serverId })
    })}`).then(res => res.json()).catch(() => ({ overall: { totalSales: 0, totalQuantity: 0 } }))
  ]);

  const servers = await prisma.mikrotikServer.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' }
  });

  const resellers = await prisma.user.findMany({
    where: {
      role: 'RESELLER',
      status: 'ACTIVE'
    },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Sales & Reports</h2>
        <p className="text-gray-500 mt-1">Laporan penjualan voucher hotspot</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-2xl font-bold text-indigo-600">
                Rp {Number(stats.overall?.totalSales || 0).toLocaleString('id-ID')}
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
              <p className="text-sm text-gray-500">Total Quantity</p>
              <p className="text-2xl font-bold text-green-600">
                {stats.overall?.totalQuantity || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Count</p>
              <p className="text-2xl font-bold text-blue-600">{total}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form method="get" className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
              Reseller
            </label>
            <select
              name="resellerUserId"
              defaultValue={resellerUserId || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Reseller</option>
              {resellers.map((reseller) => (
                <option key={reseller.id} value={reseller.id}>
                  {reseller.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              name="paymentStatus"
              defaultValue={paymentStatus || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate || ''}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </form>
      </div>

      {/* Sales List */}
      <SalesList 
        sales={sales.map(sale => ({
          ...sale,
          unitPrice: Number(sale.unitPrice),
          totalAmount: Number(sale.totalAmount)
        }))} 
        total={total} 
        page={page} 
        limit={limit} 
      />
    </div>
  );
}

