import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { routerosService } from '@/lib/services/routeros-service';

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
 * POST /api/admin/hotspot/sessions/[id]/disconnect
 * Disconnect session
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

    const session = await prisma.hotspotSession.findUnique({
      where: { id },
      include: {
        server: true
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Disconnect from MikroTik if session ID exists
    if (session.mikrotikSessionId) {
      try {
        await routerosService.disconnectSession(
          session.serverId,
          session.mikrotikSessionId
        );
      } catch (error) {
        console.error('Error disconnecting from MikroTik:', error);
        // Continue to update database even if MikroTik disconnect fails
      }
    }

    // Update session status
    await prisma.hotspotSession.update({
      where: { id },
      data: {
        status: 'STOPPED',
        stopTime: new Date()
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error disconnecting session:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect session', details: error.message },
      { status: 500 }
    );
  }
}


