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
 * GET /api/reseller/komisi
 * Get reseller's komisi records
 */
export async function GET(request: NextRequest) {
  try {
    const resellerId = await checkResellerAuth();
    if (!resellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = { resellerUserId: resellerId };
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      prisma.komisiRecord.findMany({
        where,
        include: {
          sale: {
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
              }
            }
          },
          rule: {
            select: {
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
      prisma.komisiRecord.count({ where })
    ]);

    // Calculate totals by status
    const totals = await prisma.komisiRecord.groupBy({
      by: ['status'],
      where: { resellerUserId: resellerId },
      _sum: {
        komisiAmount: true
      }
    });

    const totalsByStatus = totals.reduce((acc, item) => {
      acc[item.status] = Number(item._sum.komisiAmount || 0);
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      totals: totalsByStatus
    });
  } catch (error: any) {
    console.error('Error fetching reseller komisi:', error);
    return NextResponse.json(
      { error: 'Failed to fetch komisi', details: error.message },
      { status: 500 }
    );
  }
}


