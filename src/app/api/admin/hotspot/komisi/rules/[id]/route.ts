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
 * PUT /api/admin/hotspot/komisi/rules/[id]
 * Update komisi rule
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
      packageId,
      serverId,
      resellerLevel,
      komisiType,
      komisiValue,
      minSaleAmount,
      maxKomisiAmount,
      validFrom,
      validUntil,
      isActive
    } = body;

    const rule = await prisma.komisiRule.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        packageId: packageId !== undefined ? packageId : undefined,
        serverId: serverId !== undefined ? serverId : undefined,
        resellerLevel: resellerLevel !== undefined ? resellerLevel : undefined,
        komisiType: komisiType || undefined,
        komisiValue: komisiValue !== undefined ? komisiValue : undefined,
        minSaleAmount: minSaleAmount !== undefined ? minSaleAmount : undefined,
        maxKomisiAmount: maxKomisiAmount !== undefined ? maxKomisiAmount : undefined,
        validFrom: validFrom ? new Date(validFrom) : undefined,
        validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined
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

    return NextResponse.json({ rule });
  } catch (error: any) {
    console.error('Error updating komisi rule:', error);
    return NextResponse.json(
      { error: 'Failed to update komisi rule', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/hotspot/komisi/rules/[id]
 * Delete komisi rule
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

    // Check if rule has komisi records
    const rule = await prisma.komisiRule.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            komisiRecords: true
          }
        }
      }
    });

    if (!rule) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }

    if (rule._count.komisiRecords > 0) {
      return NextResponse.json(
        { error: 'Cannot delete rule with existing komisi records. Deactivate it instead.' },
        { status: 400 }
      );
    }

    await prisma.komisiRule.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting komisi rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete komisi rule', details: error.message },
      { status: 500 }
    );
  }
}


