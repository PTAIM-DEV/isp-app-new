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
 * POST /api/admin/hotspot/vouchers/check-status
 * Check status voucher di database dan MikroTik
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { codes } = await request.json();
    if (!Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ error: 'Codes array required' }, { status: 400 });
    }

    const results: Array<{
      code: string;
      found: boolean;
      message?: string;
      statusInDB?: string;
      actualStatus?: 'AKTIF' | 'TERPAKAI' | 'BELUM_DIGUNAKAN' | 'KADALUARSA';
      hasActiveSessionMikrotik?: boolean;
      hasActiveSessionDB?: boolean;
      mikrotikError?: string | null;
      uptime?: string | null;
      serverName?: string;
    }> = [];

    for (const code of codes) {
      // Get voucher dari database
      const voucher = await prisma.hotspotVoucher.findFirst({
        where: { code: code },
        include: {
          server: true,
          sessions: {
            where: { status: 'ACTIVE' },
            orderBy: { startTime: 'desc' },
            take: 1
          }
        }
      });

      if (!voucher) {
        results.push({
          code,
          found: false,
          message: 'Voucher tidak ditemukan di database'
        });
        continue;
      }

      // Get active sessions dari MikroTik
      let mikrotikActiveSessions: any[] = [];
      let mikrotikError: string | null = null;

      try {
        mikrotikActiveSessions = await routerosService.getActiveSessions(voucher.serverId);
        const username = voucher.username || voucher.code;
        mikrotikActiveSessions = mikrotikActiveSessions.filter(
          (s: any) => (s.user || s['name']) === username
        );
      } catch (error: any) {
        mikrotikError = error.message;
      }

      const hasActiveSessionMikrotik = mikrotikActiveSessions.length > 0;
      const hasActiveSessionDB = voucher.sessions.length > 0;
      const statusInDB = voucher.status;

      // Determine actual status
      let actualStatus: 'AKTIF' | 'TERPAKAI' | 'BELUM_DIGUNAKAN' | 'KADALUARSA' = 'BELUM_DIGUNAKAN';

      if (hasActiveSessionMikrotik) {
        actualStatus = 'AKTIF';
      } else if (statusInDB === 'USED' || hasActiveSessionDB) {
        actualStatus = 'TERPAKAI';
      } else if (statusInDB === 'EXPIRED') {
        actualStatus = 'KADALUARSA';
      } else if (statusInDB === 'ACTIVE' && !hasActiveSessionMikrotik) {
        // Status di DB ACTIVE tapi tidak ada session di MikroTik → kemungkinan baru disconnect
        actualStatus = 'TERPAKAI';
      }

      results.push({
        code,
        found: true,
        statusInDB,
        actualStatus,
        hasActiveSessionMikrotik,
        hasActiveSessionDB,
        mikrotikError,
        uptime: mikrotikActiveSessions[0]?.['uptime'] || null,
        serverName: voucher.server.name
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('[CHECK STATUS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check status',
        details: error.message
      },
      { status: 500 }
    );
  }
}




