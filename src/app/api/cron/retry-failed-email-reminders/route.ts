import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// ⚠️ sendPaymentReminder import removed karena reminder disabled
// import { sendPaymentReminder } from '@/lib/payment-reminder';

/**
 * Endpoint untuk retry email reminder yang belum terkirim
 * Mencari semua ScheduledReminder dengan status PENDING atau FAILED yang emailSent = false
 * dan mencoba kirim ulang email menggunakan email server baru dari .env
 */
export async function GET() {
    try {
        console.log('[Retry Email Reminders] Starting retry process...');

        // Cari semua reminder yang email belum terkirim
        const failedEmailReminders = await prisma.scheduledReminder.findMany({
            where: {
                OR: [
                    // Status PENDING dan emailSent = false
                    {
                        status: 'PENDING',
                        emailSent: false,
                    },
                    // Status FAILED dan emailSent = false (untuk retry)
                    {
                        status: 'FAILED',
                        emailSent: false,
                        retryCount: { lt: 3 }, // Hanya retry yang belum mencapai max retries
                    },
                ],
            },
            include: {
                invoice: {
                    include: {
                        user: true,
                    },
                },
            },
            orderBy: {
                scheduledAt: 'asc', // Process yang paling lama dulu
            },
        });

        console.log(`[Retry Email Reminders] Found ${failedEmailReminders.length} reminders with failed email`);

        if (failedEmailReminders.length === 0) {
            return NextResponse.json({
                message: 'No failed email reminders found',
                retried: 0,
                success: 0,
                failed: 0,
            });
        }

        let successCount = 0;
        let failedCount = 0;
        const results: Array<{
            reminderId: string;
            invoiceId: string;
            invoiceNumber: string | null;
            reminderType: string;
            userEmail: string | null;
            userName: string;
            status: 'success' | 'failed';
            error?: string;
        }> = [];

        // ⚠️ Rate limiting disabled karena reminder disabled
        // const EMAIL_RATE_LIMIT_MS = 2 * 1000; // 2 seconds

        for (let i = 0; i < failedEmailReminders.length; i++) {
            const reminder = failedEmailReminders[i];
            const invoice = reminder.invoice;
            const user = invoice?.user;

            // Skip jika invoice sudah dibayar
            if (invoice?.status === 'PAID') {
                console.log(`[Retry Email Reminders] Skipping reminder ${reminder.id} - invoice already paid`);
                // Update status to CANCELLED
                await prisma.scheduledReminder.update({
                    where: { id: reminder.id },
                    data: { status: 'CANCELLED' },
                });
                continue;
            }

            // Skip jika user tidak ada email
            if (!user?.email) {
                console.log(`[Retry Email Reminders] Skipping reminder ${reminder.id} - user has no email`);
                results.push({
                    reminderId: reminder.id,
                    invoiceId: reminder.invoiceId,
                    invoiceNumber: invoice?.invoiceNumber || null,
                    reminderType: reminder.reminderType,
                    userEmail: null,
                    userName: user?.name || 'Unknown',
                    status: 'failed',
                    error: 'User has no email address',
                });
                failedCount++;
                continue;
            }

            try {
                console.log(`[Retry Email Reminders] ⚠️ Reminder sending DISABLED - Skipping reminder ${reminder.id} (${i + 1}/${failedEmailReminders.length})`);
                console.log(`[Retry Email Reminders]   - Invoice: ${invoice?.invoiceNumber || reminder.invoiceId}`);
                console.log(`[Retry Email Reminders]   - User: ${user.name} (${user.email})`);
                console.log(`[Retry Email Reminders]   - Reminder Type: ${reminder.reminderType}`);
                
                // ⚠️ ALL REMINDERS DISABLED - Skip retry
                results.push({
                    reminderId: reminder.id,
                    invoiceId: reminder.invoiceId,
                    invoiceNumber: invoice?.invoiceNumber || null,
                    reminderType: reminder.reminderType,
                    userEmail: user.email,
                    userName: user.name,
                    status: 'failed',
                    error: 'Reminder sending disabled',
                });
                failedCount++;
                continue; // Skip to next reminder
            } catch (error) {
                console.error(`[Retry Email Reminders] ❌ Error retrying reminder ${reminder.id}:`, error);

                const newRetryCount = reminder.retryCount + 1;
                const newStatus = newRetryCount >= 3 ? 'FAILED' : 'PENDING';

                await prisma.scheduledReminder.update({
                    where: { id: reminder.id },
                    data: {
                        retryCount: newRetryCount,
                        status: newStatus,
                        lastError: error instanceof Error ? error.message : 'Unknown error',
                    },
                });

                failedCount++;
                results.push({
                    reminderId: reminder.id,
                    invoiceId: reminder.invoiceId,
                    invoiceNumber: invoice?.invoiceNumber || null,
                    reminderType: reminder.reminderType,
                    userEmail: user?.email || null,
                    userName: user?.name || 'Unknown',
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        console.log(`[Retry Email Reminders] Completed: ${successCount} succeeded, ${failedCount} failed`);

        return NextResponse.json({
            message: 'Email retry process completed',
            summary: {
                totalFound: failedEmailReminders.length,
                success: successCount,
                failed: failedCount,
            },
            results,
        });
    } catch (error) {
        console.error('[Retry Email Reminders] Cron Error:', error);
        return NextResponse.json(
            {
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

