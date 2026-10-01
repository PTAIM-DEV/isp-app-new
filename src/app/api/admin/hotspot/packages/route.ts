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
 * GET /api/admin/hotspot/packages
 * List all packages
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const isActive = searchParams.get('isActive');

    const packages = await prisma.hotspotPackage.findMany({
      where: {
        serverId: serverId || undefined,
        isActive: isActive !== null ? isActive === 'true' : undefined
      },
      include: {
        server: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            vouchers: true,
            sales: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ packages });
  } catch (error: any) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch packages', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/hotspot/packages
 * Create new package
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
      serverId,
      duration,
      limitUptime,
      price,
      downloadSpeed,
      uploadSpeed
    } = body;

    // Validate required fields
    if (!name || !serverId || !duration || !price) {
      return NextResponse.json(
        { error: 'Missing required fields: name, serverId, duration, price' },
        { status: 400 }
      );
    }

    // Check if server exists
    const server = await prisma.mikrotikServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      return NextResponse.json(
        { error: 'Server not found' },
        { status: 404 }
      );
    }

    // Create package
    const package_ = await prisma.hotspotPackage.create({
      data: {
        name,
        description,
        serverId,
        duration,
        limitUptime,
        price,
        downloadSpeed,
        uploadSpeed
      },
      include: {
        server: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    return NextResponse.json({ package: package_ }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { error: 'Failed to create package', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/hotspot/packages
 * Bulk delete packages (by IDs). Only deletes if package has no vouchers.
 * Body: { ids: string[] }
 */
export async function DELETE(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const ids: string[] = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];

    if (ids.length === 0) {
      return NextResponse.json(
        { error: 'No package IDs provided' },
        { status: 400 }
      );
    }

    // Ambil packages beserta count vouchers/sales
    const packages = await prisma.hotspotPackage.findMany({
      where: { id: { in: ids } },
      include: {
        _count: {
          select: { vouchers: true, sales: true }
        }
      }
    });

    const notFoundIds = ids.filter(id => !packages.some(p => p.id === id));

    const deletable = packages.filter(p => p._count.vouchers === 0);
    const blocked = packages.filter(p => p._count.vouchers > 0);

    // Hapus yang tidak punya voucher
    if (deletable.length > 0) {
      await prisma.hotspotPackage.deleteMany({
        where: { id: { in: deletable.map(p => p.id) } }
      });
    }

    return NextResponse.json({
      success: true,
      deleted: deletable.map(p => p.id),
      blocked: blocked.map(p => ({ id: p.id, vouchers: p._count.vouchers })),
      notFound: notFoundIds
    });
  } catch (error: any) {
    console.error('Error bulk deleting packages:', error);
    return NextResponse.json(
      { error: 'Failed to delete packages', details: error.message },
      { status: 500 }
    );
  }
}


