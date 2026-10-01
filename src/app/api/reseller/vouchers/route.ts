import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hotspotVoucherService } from '@/lib/services/hotspot-voucher-service';

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
 * GET /api/reseller/vouchers
 * Get reseller's vouchers
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
    console.error('Error fetching reseller vouchers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vouchers', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reseller/vouchers/generate
 * Generate vouchers (reseller)
 */
export async function POST(request: NextRequest) {
  try {
    const resellerId = await checkResellerAuth();
    if (!resellerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      serverId,
      packageId,
      quantity,
      prefix,
      codeLength,
      combination,
      username,
      password
    } = body;

    if (!serverId || !packageId || !quantity || quantity < 1) {
      return NextResponse.json(
        { error: 'Missing required fields: serverId, packageId, quantity (min 1)' },
        { status: 400 }
      );
    }

    // Check if reseller has access to this server (optional: add tier check)
    const server = await prisma.mikrotikServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Generate vouchers
    const vouchers = await hotspotVoucherService.generateVouchers(
      serverId,
      packageId,
      quantity,
      {
        prefix: prefix || '',
        codeLength: codeLength || 8,
        combination: combination || 'ALPHANUMERIC',
        username: username || false,
        password: password || false
      },
      resellerId
    );

    return NextResponse.json({ 
      vouchers,
      count: vouchers.length 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error generating vouchers:', error);
    return NextResponse.json(
      { error: 'Failed to generate vouchers', details: error.message },
      { status: 500 }
    );
  }
}


