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
 * GET /api/reseller/sales
 * Get reseller's sales
 */
export async function GET(request: NextRequest) {
  try {
    const resellerId = await checkResellerAuth();
    if (!resellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const paymentStatus = searchParams.get('paymentStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = { resellerUserId: resellerId };
    
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [sales, total] = await Promise.all([
      prisma.voucherSale.findMany({
        where,
        include: {
          voucher: {
            select: {
              id: true,
              code: true
            }
          },
          package: {
            select: {
              id: true,
              name: true
            }
          },
          server: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.voucherSale.count({ where })
    ]);

    // Calculate totals
    const totals = await prisma.voucherSale.aggregate({
      where,
      _sum: {
        totalAmount: true,
        quantity: true
      }
    });

    return NextResponse.json({
      sales,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      totals: {
        totalSales: Number(totals._sum.totalAmount || 0),
        totalQuantity: totals._sum.quantity || 0
      }
    });
  } catch (error: any) {
    console.error('Error fetching reseller sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales', details: error.message },
      { status: 500 }
    );
  }
}


