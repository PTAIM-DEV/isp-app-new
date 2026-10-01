import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

/**
 * Check reseller authentication
 * Reseller login menggunakan User dengan role RESELLER
 */
async function checkResellerAuth(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('reseller_session');
  
  if (!session) {
    return null;
  }

  // Find reseller by session token
  // Session format: reseller_session_{userId} = token
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
        
        // Verify user is reseller
        const user = await prisma.user.findUnique({
          where: { id: resellerId },
          select: { id: true, role: true, status: true }
        });

        if (user && user.role === 'RESELLER') {
          return resellerId;
        }
      }
    } catch (e) {
      // Skip invalid session data
    }
  }

  return null;
}

/**
 * GET /api/reseller/dashboard
 * Get reseller dashboard stats
 */
export async function GET(request: NextRequest) {
  try {
    const resellerId = await checkResellerAuth();
    
    if (!resellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Today's stats
    const todayStats = await prisma.voucherSale.aggregate({
      where: {
        resellerUserId: resellerId,
        createdAt: { gte: todayStart }
      },
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    });

    // This month's stats
    const monthStats = await prisma.voucherSale.aggregate({
      where: {
        resellerUserId: resellerId,
        createdAt: { gte: monthStart }
      },
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    });

    // Total stats
    const totalStats = await prisma.voucherSale.aggregate({
      where: {
        resellerUserId: resellerId
      },
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true
    });

    // Komisi stats
    const komisiStats = await prisma.komisiRecord.aggregate({
      where: {
        resellerUserId: resellerId
      },
      _sum: {
        komisiAmount: true
      },
      _count: true
    });

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

    // Recent sales (last 10)
    const recentSales = await prisma.voucherSale.findMany({
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
        },
        server: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Top packages
    const topPackages = await prisma.voucherSale.groupBy({
      by: ['packageId'],
      where: {
        resellerUserId: resellerId
      },
      _sum: {
        totalAmount: true,
        quantity: true
      },
      _count: true,
      orderBy: {
        _sum: {
          totalAmount: 'desc'
        }
      },
      take: 5
    });

    const packageIds = topPackages.map(p => p.packageId).filter(Boolean) as string[];
    const packages = await prisma.hotspotPackage.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, name: true }
    });

    const topPackagesWithNames = topPackages.map(sale => ({
      packageId: sale.packageId,
      packageName: packages.find(p => p.id === sale.packageId)?.name || 'Unknown',
      totalAmount: Number(sale._sum.totalAmount || 0),
      quantity: sale._sum.quantity || 0,
      count: sale._count
    }));

    return NextResponse.json({
      stats: {
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
        total: {
          totalSales: Number(totalStats._sum.totalAmount || 0),
          totalQuantity: totalStats._sum.quantity || 0,
          totalCount: totalStats._count
        },
        komisi: {
          total: Number(komisiStats._sum.komisiAmount || 0),
          pending: Number(pendingKomisi._sum.komisiAmount || 0),
          paid: Number(paidKomisi._sum.komisiAmount || 0),
          totalRecords: komisiStats._count
        }
      },
      recentSales,
      topPackages: topPackagesWithNames
    });
  } catch (error: any) {
    console.error('Error fetching reseller dashboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard', details: error.message },
      { status: 500 }
    );
  }
}


