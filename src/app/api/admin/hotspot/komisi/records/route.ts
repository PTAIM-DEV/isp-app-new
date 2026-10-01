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
 * GET /api/admin/hotspot/komisi/records
 * List komisi records
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const resellerUserId = searchParams.get('resellerUserId');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};
    if (resellerUserId) where.resellerUserId = resellerUserId;
    if (status) where.status = status;

    const [records, total] = await Promise.all([
      prisma.komisiRecord.findMany({
        where,
        include: {
          resellerUser: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          },
          sale: {
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
              }
            }
          },
          rule: {
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
      prisma.komisiRecord.count({ where })
    ]);

    // Calculate totals
    const totals = await prisma.komisiRecord.aggregate({
      where,
      _sum: {
        komisiAmount: true
      }
    });

    return NextResponse.json({
      records,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      totals: {
        totalKomisi: Number(totals._sum.komisiAmount || 0)
      }
    });
  } catch (error: any) {
    console.error('Error fetching komisi records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch komisi records', details: error.message },
      { status: 500 }
    );
  }
}


