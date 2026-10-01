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
 * GET /api/admin/hotspot/servers/[id]/status
 * Get server connection status
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
      where: { id },
      select: {
        id: true,
        name: true,
        connectionStatus: true,
        lastConnected: true,
        errorMessage: true,
        _count: {
          select: {
            vouchers: true,
            packages: true,
            users: true,
            sessions: {
              where: {
                status: 'ACTIVE'
              }
            }
          }
        }
      }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      status: server.connectionStatus,
      lastConnected: server.lastConnected,
      errorMessage: server.errorMessage,
      stats: {
        totalVouchers: server._count.vouchers,
        totalPackages: server._count.packages,
        totalUsers: server._count.users,
        activeSessions: server._count.sessions
      }
    });
  } catch (error: any) {
    console.error('Error fetching server status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server status', details: error.message },
      { status: 500 }
    );
  }
}


