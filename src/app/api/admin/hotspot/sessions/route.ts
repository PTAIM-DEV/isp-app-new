import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { routerosService } from '@/lib/services/routeros-service';
import { voucherMonitorService } from '@/lib/services/voucher-monitor-service';
import crypto from 'crypto';

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

function decryptPassword(encryptedPassword: string): string {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const ALGORITHM = 'aes-256-cbc';
  const parts = encryptedPassword.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32),
    iv
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * GET /api/admin/hotspot/sessions
 * List active sessions
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');
    const status = searchParams.get('status') || 'ACTIVE';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const where: any = { status };
    if (serverId) where.serverId = serverId;

    const [sessions, total] = await Promise.all([
      prisma.hotspotSession.findMany({
        where,
        include: {
          server: {
            select: {
              id: true,
              name: true
            }
          },
          voucher: {
            select: {
              id: true,
              code: true
            }
          },
          user: {
            select: {
              id: true,
              username: true
            }
          }
        },
        orderBy: {
          startTime: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.hotspotSession.count({ where })
    ]);

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/hotspot/sessions/sync
 * Sync sessions from MikroTik
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { serverId } = body;

    if (!serverId) {
      return NextResponse.json(
        { error: 'Missing required field: serverId' },
        { status: 400 }
      );
    }

    const server = await prisma.mikrotikServer.findUnique({
      where: { id: serverId }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Use voucher monitor service to sync and update voucher status
    const result = await voucherMonitorService.syncServerSessions(serverId);

    return NextResponse.json({ 
      success: true,
      synced: result.sessionsSynced,
      vouchersUpdated: result.vouchersUpdated,
      total: result.sessionsSynced
    });
  } catch (error: any) {
    console.error('Error syncing sessions:', error);
    return NextResponse.json(
      { error: 'Failed to sync sessions', details: error.message },
      { status: 500 }
    );
  }
}


