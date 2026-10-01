import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

async function checkResellerAuth(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('reseller_session');
  if (!session) return null;

  const sessions = await prisma.systemSetting.findMany({
    where: { key: { startsWith: 'reseller_session_' } }
  });

  for (const sessionData of sessions) {
    try {
      const { token } = JSON.parse(sessionData.value);
      if (token === session.value) {
        const resellerId = sessionData.key.replace('reseller_session_', '');
        const user = await prisma.user.findUnique({
          where: { id: resellerId },
          select: { id: true, role: true }
        });
        if (user && user.role === 'RESELLER') {
          return resellerId;
        }
      }
    } catch (e) {}
  }
  return null;
}

/**
 * GET /api/reseller/reports
 * Get reseller reports (sales over time, etc)
 */
export async function GET(request: NextRequest) {
  try {
    const resellerId = await checkResellerAuth();
    if (!resellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month

    const where: any = { resellerUserId: resellerId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // Get all sales in date range
    const sales = await prisma.voucherSale.findMany({
      where,
      select: {
        createdAt: true,
        totalAmount: true,
        quantity: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Group by time period
    const grouped: Record<string, { totalAmount: number; quantity: number; count: number }> = {};

    sales.forEach(sale => {
      const date = new Date(sale.createdAt);
      let key = '';

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else if (groupBy === 'month') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      if (!grouped[key]) {
        grouped[key] = { totalAmount: 0, quantity: 0, count: 0 };
      }

      grouped[key].totalAmount += Number(sale.totalAmount);
      grouped[key].quantity += sale.quantity;
      grouped[key].count += 1;
    });

    // Convert to array format
    const salesOverTime = Object.entries(grouped)
      .map(([date, stats]) => ({
        date,
        totalAmount: stats.totalAmount,
        quantity: stats.quantity,
        count: stats.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

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

    return NextResponse.json({
      salesOverTime,
      salesByPackage: salesByPackageWithNames
    });
  } catch (error: any) {
    console.error('Error fetching reseller reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reports', details: error.message },
      { status: 500 }
    );
  }
}


