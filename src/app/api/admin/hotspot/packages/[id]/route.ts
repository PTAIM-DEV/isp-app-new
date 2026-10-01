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
 * GET /api/admin/hotspot/packages/[id]
 * Get package details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const package_ = await prisma.hotspotPackage.findUnique({
      where: { id },
      include: {
        server: true,
        _count: {
          select: {
            vouchers: true,
            sales: true
          }
        }
      }
    });

    if (!package_) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json({ package: package_ });
  } catch (error: any) {
    console.error('Error fetching package:', error);
    return NextResponse.json(
      { error: 'Failed to fetch package', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/hotspot/packages/[id]
 * Update package
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      name,
      description,
      serverId,
      duration,
      limitUptime,
      price,
      downloadSpeed,
      uploadSpeed,
      isActive
    } = body;

    // Check if package exists
    const existingPackage = await prisma.hotspotPackage.findUnique({
      where: { id }
    });

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Update package
    const package_ = await prisma.hotspotPackage.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        serverId: serverId || undefined,
        duration: duration || undefined,
        limitUptime: limitUptime !== undefined ? limitUptime : undefined,
        price: price !== undefined ? price : undefined,
        downloadSpeed: downloadSpeed !== undefined ? downloadSpeed : undefined,
        uploadSpeed: uploadSpeed !== undefined ? uploadSpeed : undefined,
        isActive: isActive !== undefined ? isActive : undefined
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

    return NextResponse.json({ package: package_ });
  } catch (error: any) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { error: 'Failed to update package', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/hotspot/packages/[id]
 * Delete package
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if package has vouchers
    const package_ = await prisma.hotspotPackage.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vouchers: true,
            sales: true
          }
        }
      }
    });

    if (!package_) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    if (package_._count.vouchers > 0) {
      return NextResponse.json(
        { error: 'Cannot delete package with existing vouchers. Please delete vouchers first.' },
        { status: 400 }
      );
    }

    // Delete package
    await prisma.hotspotPackage.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { error: 'Failed to delete package', details: error.message },
      { status: 500 }
    );
  }
}


