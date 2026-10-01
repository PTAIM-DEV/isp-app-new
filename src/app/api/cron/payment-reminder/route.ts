import { NextResponse } from 'next/server';

/**
 * ⚠️ DEPRECATED: Payment Reminder Cron V1 - DISABLED
 * 
 * Cron job ini sudah dinonaktifkan karena:
 * 1. Menyebabkan duplicate reminder (create reminder baru setiap kali berjalan)
 * 2. Sudah ada Cron V2 yang lebih baik (/api/cron/payment-reminder-v2)
 * 3. Cron V2 menggunakan ScheduledReminder yang sudah di-schedule saat invoice dibuat
 * 
 * Gunakan /api/cron/payment-reminder-v2 sebagai gantinya
 */
export async function GET() {
    return NextResponse.json({
        message: 'Payment Reminder Cron V1 is deprecated and disabled',
        reason: 'Use /api/cron/payment-reminder-v2 instead',
        deprecated: true,
    }, { status: 410 }); // 410 Gone - resource is no longer available
}
