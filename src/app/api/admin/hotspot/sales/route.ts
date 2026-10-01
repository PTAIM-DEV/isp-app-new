import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hotspotVoucherService } from '@/lib/services/hotspot-voucher-service';

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
 * GET /api/admin/hotspot/sales
 * List sales with filters
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const resellerUserId = searchParams.get('resellerUserId');
    const paymentStatus = searchParams.get('paymentStatus');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
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
          },
          resellerUser: {
            select: {
              id: true,
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
    console.error('Error fetching sales:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sales', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/hotspot/sales
 * Record sale
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      voucherId,
      quantity,
      unitPrice,
      paymentMethod,
      resellerUserId,
      notes
    } = body;

    if (!voucherId || !quantity || !unitPrice) {
      return NextResponse.json(
        { error: 'Missing required fields: voucherId, quantity, unitPrice' },
        { status: 400 }
      );
    }

    // Record sale
    const sale = await hotspotVoucherService.recordSale(
      voucherId,
      quantity,
      unitPrice,
      paymentMethod,
      resellerUserId,
      notes
    );

    return NextResponse.json({ sale }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording sale:', error);
    return NextResponse.json(
      { error: 'Failed to record sale', details: error.message },
      { status: 500 }
    );
  }
}


