import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPaymentReminder } from '@/lib/payment-reminder';

/**
 * Helper function to delay execution (for batch processing)
 * ⚠️ Rate limiting disabled karena reminder disabled
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ✅ Rate limiting untuk WhatsApp: random 10-60 detik
function getRandomWhatsAppDelay(): number {
    const min = 10 * 1000; // 10 detik
    const max = 60 * 1000; // 60 detik
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Payment Reminder Cron V2 - Runs daily at 6 AM GMT+7
 * 
 * Optimizations:
 * - Query ScheduledReminder based on scheduledAt (not invoice dueDate)
 * - Batch processing with chunk size
 * - Parallel processing for email and WhatsApp
 * - Different rate limiting: 20s WhatsApp, 2-3s email
 * - Retry mechanism: max 3 times per day
 */
export async function GET() {
    try {
        // ✅ Check jam 08:00 AM GMT+7 sebelum kirim
        const now = new Date();
        const gmt7Offset = 7 * 60; // GMT+7 offset in minutes
        const localTime = new Date(now.getTime() + (gmt7Offset - now.getTimezoneOffset()) * 60 * 1000);
        const currentHour = localTime.getHours();
        const currentMinute = localTime.getMinutes();

        // Hanya kirim jika sudah di atas jam 08:00 AM GMT+7
        if (currentHour < 8 || (currentHour === 8 && currentMinute === 0)) {
            console.log(`[Payment Reminder Cron V2] ⏰ Current time is ${currentHour}:${currentMinute.toString().padStart(2, '0')} GMT+7, waiting until 08:00 AM`);
            return NextResponse.json({
                message: 'Reminder sending is only allowed after 08:00 AM GMT+7',
                currentTime: localTime.toISOString(),
                currentHourGMT7: currentHour,
                currentMinuteGMT7: currentMinute,
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        console.log(`[Payment Reminder Cron V2] Starting at ${new Date().toISOString()} (${currentHour}:${currentMinute.toString().padStart(2, '0')} GMT+7)`);

        // Query ScheduledReminder that need to be sent today
        // scheduledAt <= today AND status = PENDING AND retryCount < 3
        // ✅ FIX: Exclude reminders yang sudah di-process hari ini untuk prevent duplicate
        const dueReminders = await prisma.scheduledReminder.findMany({
            where: {
                scheduledAt: {
                    lte: todayEnd, // Reminders scheduled for today or earlier
                },
                status: 'PENDING',
                retryCount: {
                    lt: 3, // Max 3 retries per day
                },
                // ✅ FIX: Exclude reminders yang sudah di-process hari ini
                // Check sentAt untuk prevent duplicate processing
                sentAt: null, // Belum pernah dikirim
                invoice: {
                    deletedAt: null, // Exclude soft-deleted invoices
                    status: {
                        in: ['UNPAID', 'OVERDUE'], // Only unpaid invoices
                    },
                },
            },
            include: {
                invoice: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                email: true,
                                status: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                scheduledAt: 'asc', // Process oldest first
            },
        });

        console.log(`[Payment Reminder Cron V2] Found ${dueReminders.length} reminders to process`);

        // ✅ UPDATE: Track results untuk D-5, D-0, D+3, D+5
        const results = {
            'D-5': { total: 0, whatsapp: 0, email: 0, failed: 0, skipped: 0 },
            'D-0': { total: 0, whatsapp: 0, email: 0, failed: 0, skipped: 0 },
            'D+3': { total: 0, whatsapp: 0, email: 0, failed: 0, skipped: 0 },
            'D+5': { total: 0, whatsapp: 0, email: 0, failed: 0, skipped: 0, blocked: 0 },
        };

        // Count by type
        dueReminders.forEach(rem => {
            const type = rem.reminderType as keyof typeof results;
            if (results[type]) {
                results[type].total++;
            }
        });

        // Batch processing constants
        const BATCH_SIZE = 50; // Process in batches to avoid memory issues



        // Process reminders in batches
        for (let batchStart = 0; batchStart < dueReminders.length; batchStart += BATCH_SIZE) {
            const batch = dueReminders.slice(batchStart, batchStart + BATCH_SIZE);
            console.log(`[Payment Reminder Cron V2] Processing batch ${Math.floor(batchStart / BATCH_SIZE) + 1}/${Math.ceil(dueReminders.length / BATCH_SIZE)} (${batch.length} reminders)`);

            // Process batch sequentially (for rate limiting)
            for (let i = 0; i < batch.length; i++) {
                const reminder = batch[i];
                const { invoice, reminderType, id: reminderId } = reminder;
                const reminderTypeKey = reminderType as keyof typeof results;

                try {
                    // Skip if invoice already paid
                    if (invoice.status === 'PAID') {
                        console.log(`[Payment Reminder Cron V2] Skipping reminder ${reminderId} - invoice already paid`);
                        results[reminderTypeKey].skipped++;
                        await prisma.scheduledReminder.update({
                            where: { id: reminderId },
                            data: { status: 'CANCELLED' },
                        });
                        continue;
                    }

                    console.log(`[Payment Reminder Cron V2] Processing ${i + 1}/${batch.length}: ${reminderType} for ${invoice.user.name} (invoice: ${invoice.invoiceNumber || invoice.id})`);

                    // ✅ FIX: Double check untuk prevent race condition
                    // Update status ke PROCESSING sebelum process untuk prevent duplicate
                    const currentReminder = await prisma.scheduledReminder.findUnique({
                        where: { id: reminderId },
                    });

                    if (!currentReminder) {
                        console.log(`[Payment Reminder Cron V2] Reminder ${reminderId} not found, skipping`);
                        results[reminderTypeKey].skipped++;
                        continue;
                    }

                    // ✅ FIX: Check jika sudah di-process hari ini (prevent duplicate)
                    if (currentReminder.sentAt && currentReminder.sentAt >= today) {
                        console.log(`[Payment Reminder Cron V2] Reminder ${reminderId} already sent today (${currentReminder.sentAt.toISOString()}), skipping`);
                        results[reminderTypeKey].skipped++;
                        continue;
                    }

                    // ✅ Check apakah WhatsApp sudah pernah dikirim untuk reminder ini
                    if (currentReminder.whatsappSent) {
                        console.log(`[Payment Reminder Cron V2] WhatsApp already sent for reminder ${reminderId} (${reminderType}), skipping duplicate`);
                        results[reminderTypeKey].skipped++;
                        continue;
                    }

                    // ✅ FIX: Check status - jika bukan PENDING, skip (prevent duplicate processing)
                    if (currentReminder.status !== 'PENDING') {
                        console.log(`[Payment Reminder Cron V2] Reminder ${reminderId} status is ${currentReminder.status}, not PENDING, skipping`);
                        results[reminderTypeKey].skipped++;
                        continue;
                    }

                    // ✅ FIX: Update status dengan atomic operation untuk prevent race condition
                    // Try to update status to mark as processing (using transaction-like check)
                    const updateResult = await prisma.scheduledReminder.updateMany({
                        where: {
                            id: reminderId,
                            status: 'PENDING', // Only update if still PENDING (prevent race condition)
                        },
                        data: {
                            lastError: 'PROCESSING', // Temporary marker untuk prevent duplicate
                        },
                    });

                    // If updateResult.count === 0, berarti sudah di-process oleh process lain
                    if (updateResult.count === 0) {
                        console.log(`[Payment Reminder Cron V2] Reminder ${reminderId} already being processed by another process, skipping`);
                        results[reminderTypeKey].skipped++;
                        continue;
                    }

                    // ✅ WhatsApp ENABLED - Kirim reminder dengan rate limiting
                    // Rate limiting random 10-60 detik untuk WhatsApp
                    const whatsappDelay = getRandomWhatsAppDelay();
                    if (i > 0) {
                        // Delay sebelum kirim (kecuali untuk reminder pertama)
                        console.log(`[Payment Reminder Cron V2] Rate limiting: waiting ${whatsappDelay / 1000} seconds before sending WhatsApp`);
                        await delay(whatsappDelay);
                    }

                    // Kirim reminder dengan reminderId untuk tracking whatsappSent
                    // ⚠️ DISABLED: Automatic payment reminder disabled per audit request
                    console.log(`[Payment Reminder Cron V2] ⚠️ SKIPPING reminder ${reminderId} for ${invoice.user.name} (DISABLED PER AUDIT)`);

                    // Mark as sent effectively to prevent retries (or maybe just keep as PENDING but log?)
                    // Let's just log and NOT send. We don't update to SENT because it really wasn't sent.
                    // But if we don't update, it will be retried next time.
                    // We should probably mark it as CANCELLED or SKIPPED if we want to stop it forever for this instance.
                    // For now, let's just NOT call the send function.

                    /*
                    const result = await sendPaymentReminder(invoice.id, reminderType as any, reminderId);

                    // Update results berdasarkan hasil pengiriman
                    if (result.whatsapp) {
                        results[reminderTypeKey].whatsapp++;
                        console.log(`[Payment Reminder Cron V2] ✅ WhatsApp sent successfully for reminder ${reminderId}`);
                    } else {
                        // Jika gagal, increment retry count
                        const newRetryCount = reminder.retryCount + 1;
                        await prisma.scheduledReminder.update({
                            where: { id: reminderId },
                            data: {
                                status: newRetryCount >= 3 ? 'FAILED' : 'PENDING',
                                retryCount: newRetryCount,
                                lastError: 'WhatsApp sending failed',
                            },
                        });
                        results[reminderTypeKey].failed++;
                        console.log(`[Payment Reminder Cron V2] ❌ WhatsApp failed for reminder ${reminderId} (retry ${newRetryCount}/3)`);
                    }
                    */

                    // We need to release the processing lock/marker
                    // AND maybe increment retry count or something to prevent infinite processing loop today?
                    // Actually, if we just don't do anything, it will remain PENDING and be picked up again next run (or every 2 seconds if not rate limited?)
                    // The cron runs "processOutgoingQueue" every 2s, but this is a separate Cron endpoint.
                    // This cron is hit once per day normally.

                    // To avoid being stuck in PENDING forever and re-processed if this cron is hit multiple times,
                    // let's mark it as 'SKIPPED' or similar if we can, or just leave it.
                    // The user asked to "stop all transmission". 
                    // I will comment out the sending code.

                    const result = { whatsapp: false, email: false }; // Mock result
                    results[reminderTypeKey].skipped++;

                    // Clear processing marker
                    await prisma.scheduledReminder.update({
                        where: { id: reminderId },
                        data: {
                            lastError: null, // Clear processing marker
                        },
                    });
                } catch (error: any) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error(`[Payment Reminder Cron V2] Error processing reminder ${reminderId}:`, errorMsg);

                    // Increment retry count
                    const newRetryCount = reminder.retryCount + 1;
                    await prisma.scheduledReminder.update({
                        where: { id: reminderId },
                        data: {
                            status: newRetryCount >= 3 ? 'FAILED' : 'PENDING',
                            retryCount: newRetryCount,
                            lastError: errorMsg,
                        },
                    });
                    results[reminderTypeKey].failed++;
                }
            }

            // Small delay between batches to avoid overwhelming the system
            if (batchStart + BATCH_SIZE < dueReminders.length) {
                await delay(1000); // 1 second between batches
            }
        }

        console.log(`[Payment Reminder Cron V2] Completed at ${new Date().toISOString()}`);

        return NextResponse.json({
            message: 'Payment reminders processed',
            results,
            totalProcessed: dueReminders.length,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[Payment Reminder Cron V2] Error:', error);
        return NextResponse.json(
            { error: 'Failed to send payment reminders', message: error.message },
            { status: 500 }
        );
    }
}

