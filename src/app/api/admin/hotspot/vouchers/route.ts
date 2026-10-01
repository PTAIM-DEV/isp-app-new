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
 * GET /api/admin/hotspot/vouchers
 * List vouchers with filters
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const packageId = searchParams.get('packageId');
    const status = searchParams.get('status');
    const resellerUserId = searchParams.get('resellerUserId');
    const code = searchParams.get('code');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = {};

    if (serverId) where.serverId = serverId;
    if (packageId) where.packageId = packageId;
    if (status) where.status = status;
    if (resellerUserId) where.resellerUserId = resellerUserId;
    if (code) where.code = { contains: code, mode: 'insensitive' };

    const [vouchers, total] = await Promise.all([
      prisma.hotspotVoucher.findMany({
        where,
        include: {
          server: {
            select: {
              id: true,
              name: true
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
              name: true,
              phone: true
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
      prisma.hotspotVoucher.count({ where })
    ]);

    return NextResponse.json({
      vouchers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching vouchers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vouchers', details: error.message },
      { status: 500 }
    );
  }
}


