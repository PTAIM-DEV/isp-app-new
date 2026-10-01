import { NextRequest, NextResponse } from 'next/server';
import { voucherExpiryService } from '@/lib/services/voucher-expiry-service';

/**
 * GET /api/cron/check-expired-vouchers
 * Cron job endpoint untuk check dan expire vouchers yang sudah expired
 * 
 * Schedule: Setiap menit (via cron job)
 * 
 * Flow:
 * 1. Check vouchers dengan expiresAt <= now dan status ACTIVE/UNUSED
 * 2. Untuk setiap expired voucher:
 *    - Logout user aktif (disconnect sessions)
 *    - Disable user di MikroTik
 *    - Update status voucher ke EXPIRED
 */
export async function GET(request: NextRequest) {
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

    console.log(`[${new Date().toISOString()}] Starting expired vouchers check...`);

    const result = await voucherExpiryService.checkAndExpireVouchers();

    console.log(`[${new Date().toISOString()}] Expired vouchers check completed:`, result);

    return NextResponse.json({
      success: true,
      message: 'Expired vouchers check completed',
      ...result
    });
  } catch (error: any) {
    console.error('Error checking expired vouchers:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check expired vouchers',
        details: error.message
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/check-expired-vouchers
 * Manual trigger untuk testing
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`[${new Date().toISOString()}] Manual trigger: Starting expired vouchers check...`);

    const result = await voucherExpiryService.checkAndExpireVouchers();

    console.log(`[${new Date().toISOString()}] Manual trigger completed:`, result);

    return NextResponse.json({
      success: true,
      message: 'Expired vouchers check completed (manual trigger)',
      ...result
    });
  } catch (error: any) {
    console.error('Error checking expired vouchers (manual trigger):', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to check expired vouchers',
        details: error.message
      },
      { status: 500 }
    );
  }
}





