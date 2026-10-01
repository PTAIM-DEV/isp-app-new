import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { voucherMonitorService } from '@/lib/services/voucher-monitor-service';

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
 * POST /api/admin/hotspot/vouchers/sync-status
 * Bisa sync per-server (disarankan) atau semua server.
 * Query string: ?serverId=<id> untuk hanya satu server.
 * Timeout diperkecil supaya tidak 504 di frontend.
 */
export const maxDuration = 30; // 30 detik global guard (Next.js)

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const serverId = searchParams.get('serverId') || undefined;

  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const label = serverId ? `server ${serverId}` : 'all servers';
    console.log(`[SYNC STATUS] Starting sync for ${label} ...`);

    // Pilih target sync
    const syncPromise = serverId
      ? voucherMonitorService.syncServerSessions(serverId)
      : voucherMonitorService.syncAllServersAndUpdateVouchers();

    // Timeout lebih pendek supaya tidak 504
    const timeoutMs = serverId ? 20000 : 25000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Sync timeout after ${timeoutMs / 1000}s`)), timeoutMs)
    );

    const result = await Promise.race([syncPromise, timeoutPromise]) as Record<string, unknown>;

    const elapsed = Date.now() - startTime;
    console.log(`[SYNC STATUS] Sync completed in ${elapsed}ms (${label})`);

    return NextResponse.json({
      success: true,
      serverId,
      ...result,
      elapsed
    });
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[SYNC STATUS] Error syncing after ${elapsed}ms (${serverId || 'all'}) :`, error);

    if (error.message && error.message.includes('timeout')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sync timeout',
          details: 'Sync terlalu lama. Coba sync per server atau periksa koneksi Mikrotik.',
          elapsed
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync status',
        details: error.message,
        elapsed
      },
      { status: 500 }
    );
  }
}

