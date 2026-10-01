import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { routerosProfileService } from '@/lib/services/routeros-profile-service';

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
 * POST /api/admin/hotspot/servers/[id]/install-scheduler
 * Install scheduler script untuk check expired vouchers di MikroTik
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const server = await prisma.mikrotikServer.findUnique({
      where: { id }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Install scheduler
    await routerosProfileService.installExpiredVoucherScheduler(id);

    return NextResponse.json({
      success: true,
      message: 'Scheduler installed successfully. Vouchers will be checked every 5 seconds for expiration.'
    });
  } catch (error: any) {
    console.error('Error installing scheduler:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to install scheduler',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/hotspot/servers/[id]/install-scheduler
 * Remove scheduler script
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

    const server = await prisma.mikrotikServer.findUnique({
      where: { id }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Remove scheduler
    await routerosProfileService.removeExpiredVoucherScheduler(id);

    return NextResponse.json({
      success: true,
      message: 'Scheduler removed successfully'
    });
  } catch (error: any) {
    console.error('Error removing scheduler:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove scheduler',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/hotspot/servers/[id]/install-scheduler
 * Check if scheduler is installed
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

    const server = await prisma.mikrotikServer.findUnique({
      where: { id }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Check if scheduler is installed
    const isInstalled = await routerosProfileService.isSchedulerInstalled(id);

    return NextResponse.json({
      success: true,
      installed: isInstalled
    });
  } catch (error: any) {
    console.error('Error checking scheduler:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check scheduler',
        details: error.message
      },
      { status: 500 }
    );
  }
}






