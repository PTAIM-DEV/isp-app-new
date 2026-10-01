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
 * GET /api/admin/hotspot/servers/status
 * Get connection status for all active servers
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const servers = await prisma.mikrotikServer.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        host: true,
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
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Format response
    const serverStatuses = servers.map(server => ({
      id: server.id,
      name: server.name,
      host: server.host,
      connectionStatus: server.connectionStatus,
      lastConnected: server.lastConnected,
      errorMessage: server.errorMessage,
      stats: {
        totalVouchers: server._count.vouchers,
        totalPackages: server._count.packages,
        totalUsers: server._count.users,
        activeSessions: server._count.sessions
      }
    }));

    return NextResponse.json({ servers: serverStatuses });
  } catch (error: any) {
    console.error('Error fetching server statuses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server statuses', details: error.message },
      { status: 500 }
    );
  }
}

