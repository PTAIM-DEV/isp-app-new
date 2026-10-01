import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  if (!session) return false;
  const adminPass = await prisma.systemSetting.findUnique({
    where: { key: 'admin_password' }
  });
  if (!adminPass) { return false; }
  return session.value === adminPass.value;
}

/**
 * GET /api/admin/hotspot/sales/stats
 * Get sales statistics
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const serverId = searchParams.get('serverId');

    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    if (serverId) where.serverId = serverId;

    // Overall stats
    const overallStats = await prisma.voucherSale.aggregate({
      where,
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true,
      _avg: {
        totalAmount: true
      }
    });

    // Today's stats
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStats = await prisma.voucherSale.aggregate({
      where: {
        ...where,
        createdAt: { gte: todayStart }
      },
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    });

    // This month's stats
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStats = await prisma.voucherSale.aggregate({
      where: {
        ...where,
        createdAt: { gte: monthStart }
      },
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    });

    // Sales by package
    const salesByPackage = await prisma.voucherSale.groupBy({
      by: ['packageId'],
      where,
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    });

    // Get package names
    const packageIds = salesByPackage.map(s => s.packageId).filter(Boolean) as string[];
    const packages = await prisma.hotspotPackage.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, name: true }
    });

    const salesByPackageWithNames = salesByPackage.map(sale => ({
      packageId: sale.packageId,
      packageName: packages.find(p => p.id === sale.packageId)?.name || 'Unknown',
      totalAmount: Number(sale._sum.totalAmount || 0),
      quantity: sale._sum.quantity || 0,
      count: sale._count
    }));

    // Sales by server
    const salesByServer = await prisma.voucherSale.groupBy({
      by: ['serverId'],
      where,
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    });

    const serverIds = salesByServer.map(s => s.serverId);
    const servers = await prisma.mikrotikServer.findMany({
      where: { id: { in: serverIds } },
      select: { id: true, name: true }
    });

    const salesByServerWithNames = salesByServer.map(sale => ({
      serverId: sale.serverId,
      serverName: servers.find(s => s.id === sale.serverId)?.name || 'Unknown',
      totalAmount: Number(sale._sum.totalAmount || 0),
      quantity: sale._sum.quantity || 0,
      count: sale._count
    }));

    return NextResponse.json({
      overall: {
        totalSales: Number(overallStats._sum.totalAmount || 0),
        totalQuantity: overallStats._sum.quantity || 0,
        totalCount: overallStats._count,
        averageSale: Number(overallStats._avg.totalAmount || 0)
      },
      today: {
        totalSales: Number(todayStats._sum.totalAmount || 0),
        totalQuantity: todayStats._sum.quantity || 0,
        totalCount: todayStats._count
      },
      thisMonth: {
        totalSales: Number(monthStats._sum.totalAmount || 0),
        totalQuantity: monthStats._sum.quantity || 0,
        totalCount: monthStats._count
      },
      byPackage: salesByPackageWithNames,
      byServer: salesByServerWithNames
    });
  } catch (error: any) {
    console.error('Error fetching sales stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales stats', details: error.message },
      { status: 500 }
    );
  }
}


