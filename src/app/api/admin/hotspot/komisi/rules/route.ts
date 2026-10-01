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
 * GET /api/admin/hotspot/komisi/rules
 * List komisi rules
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const packageId = searchParams.get('packageId');
    const serverId = searchParams.get('serverId');
    const isActive = searchParams.get('isActive');

    const where: any = {};
    if (packageId) where.packageId = packageId;
    if (serverId) where.serverId = serverId;
    if (isActive !== null) where.isActive = isActive === 'true';

    const rules = await prisma.komisiRule.findMany({
      where,
      include: {
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
        _count: {
          select: {
            komisiRecords: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ rules });
  } catch (error: any) {
    console.error('Error fetching komisi rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch komisi rules', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/hotspot/komisi/rules
 * Create komisi rule
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      packageId,
      serverId,
      resellerLevel,
      komisiType,
      komisiValue,
      minSaleAmount,
      maxKomisiAmount,
      validFrom,
      validUntil
    } = body;

    if (!name || !komisiType || !komisiValue) {
      return NextResponse.json(
        { error: 'Missing required fields: name, komisiType, komisiValue' },
        { status: 400 }
      );
    }

    const rule = await prisma.komisiRule.create({
      data: {
        name,
        description,
        packageId: packageId || null,
        serverId: serverId || null,
        resellerLevel: resellerLevel || null,
        komisiType,
        komisiValue,
        minSaleAmount: minSaleAmount || null,
        maxKomisiAmount: maxKomisiAmount || null,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null
      },
      include: {
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
      }
    });

    return NextResponse.json({ rule }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating komisi rule:', error);
    return NextResponse.json(
      { error: 'Failed to create komisi rule', details: error.message },
      { status: 500 }
    );
  }
}


