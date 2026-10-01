import { NextRequest, NextResponse } from 'next/server';
import { voucherExpiryDetectorService } from '@/lib/services/voucher-expiry-detector-service';
import '@/lib/services/start-expiry-detector';

// Pastikan runtime Node.js (bukan Edge) agar setInterval berjalan
export const runtime = 'nodejs';

/**
 * API Route untuk check voucher expiry berdasarkan nilai Mikrotik
 * Bisa dipanggil manual atau oleh cron job
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || '';

    // Check authorization (untuk cron job security)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await voucherExpiryDetectorService.checkExpiredVouchers();

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[API] Error checking voucher expiry:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST untuk start/stop scheduler
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      voucherExpiryDetectorService.start();
      return NextResponse.json({
        success: true,
        message: 'Scheduler started'
      });
    } else if (action === 'stop') {
      voucherExpiryDetectorService.stop();
      return NextResponse.json({
        success: true,
        message: 'Scheduler stopped'
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid action. Use "start" or "stop"'
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[API] Error managing scheduler:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}

