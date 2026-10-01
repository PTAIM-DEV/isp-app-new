import { NextRequest, NextResponse } from 'next/server';
import { voucherMonitorService } from '@/lib/services/voucher-monitor-service';

/**
 * POST /api/cron/sync-hotspot-sessions
 * Cron job endpoint untuk sync sessions dan update voucher status
 * 
 * Call this endpoint secara berkala (misalnya setiap 1-5 menit) untuk:
 * 1. Sync active sessions dari semua MikroTik servers
 * 2. Update status voucher berdasarkan penggunaan
 * 3. Mark stopped sessions
 * 
 * Setup cron:
 * - Via cron job: setiap 5 menit: curl -X POST https://your-domain.com/api/cron/sync-hotspot-sessions
 * - Via external cron service (cron-job.org, dll)
 * - Via Next.js API route dengan polling (tidak recommended untuk production)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication token untuk security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'change-this-in-production';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log(`[${new Date().toISOString()}] Starting hotspot sessions sync...`);

    const result = await voucherMonitorService.syncAllServersAndUpdateVouchers();

    console.log(`[${new Date().toISOString()}] Sync completed:`, result);

    return NextResponse.json({
      success: true,
      message: 'Sessions synced successfully',
      ...result
    });
  } catch (error: any) {
    console.error('Error syncing hotspot sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync sessions',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/sync-hotspot-sessions
 * Manual trigger untuk testing
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const serverId = searchParams.get('serverId');

    if (serverId) {
      // Sync single server
      const result = await voucherMonitorService.syncServerSessions(serverId);
      return NextResponse.json({
        success: true,
        message: `Sessions synced for server ${serverId}`,
        ...result
      });
    } else {
      // Sync all servers
      const result = await voucherMonitorService.syncAllServersAndUpdateVouchers();
      return NextResponse.json({
        success: true,
        message: 'Sessions synced for all servers',
        ...result
      });
    }
  } catch (error: any) {
    console.error('Error syncing hotspot sessions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to sync sessions',
        details: error.message
      },
      { status: 500 }
    );
  }
}

