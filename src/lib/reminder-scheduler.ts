import { prisma } from '@/lib/prisma';

// ✅ UPDATE: Reminder types sekarang hanya D-5, D-0, D+3, D+5
// D-5: 5 hari sebelum jatuh tempo
// D-0: Hari jatuh tempo
// D+3: 3 hari setelah jatuh tempo (past due)
// D+5: 5 hari setelah jatuh tempo (past due)
type ReminderType = 'D-5' | 'D-0' | 'D+3' | 'D+5';

/**
 * Schedule payment reminders for an invoice
 * This creates scheduled reminders in the database instead of relying on daily cron polling
 */
export async function schedulePaymentReminders(invoiceId: string, dueDate: Date) {
    try {
        // ✅ UPDATE: Calculate reminder dates untuk D-5, D-0, D+3, D+5
        // D-5: 5 hari sebelum jatuh tempo, jam 08:00 GMT+7
        const d5BeforeDate = new Date(dueDate);
        d5BeforeDate.setDate(d5BeforeDate.getDate() - 5);
        d5BeforeDate.setHours(8, 0, 0, 0); // 08:00 AM GMT+7

        // D-0: Hari jatuh tempo, jam 08:00 GMT+7
        const d0Date = new Date(dueDate);
        d0Date.setHours(8, 0, 0, 0); // 08:00 AM GMT+7

        // D+3: 3 hari setelah jatuh tempo, jam 08:00 GMT+7
        const d3AfterDate = new Date(dueDate);
        d3AfterDate.setDate(d3AfterDate.getDate() + 3);
        d3AfterDate.setHours(8, 0, 0, 0); // 08:00 AM GMT+7

        // D+5: 5 hari setelah jatuh tempo, jam 08:00 GMT+7
        const d5AfterDate = new Date(dueDate);
        d5AfterDate.setDate(d5AfterDate.getDate() + 5);
        d5AfterDate.setHours(8, 0, 0, 0); // 08:00 AM GMT+7

        // ✅ FIX: Check apakah reminder sudah ada untuk invoice ini sebelum create
        // Prevent duplicate scheduling yang menyebabkan spam
        const existingReminders = await prisma.scheduledReminder.findMany({
            where: {
                invoiceId,
                status: { in: ['PENDING', 'SENT'] }, // Check PENDING dan SENT
            },
        });

        // Jika sudah ada reminder yang masih aktif, skip scheduling untuk prevent duplicate
        if (existingReminders.length > 0) {
            console.log(`[Reminder Scheduler] ⚠️ Reminders already exist for invoice ${invoiceId} (${existingReminders.length} reminders found), skipping duplicate scheduling`);
            console.log(`[Reminder Scheduler] Existing reminders:`, existingReminders.map(r => ({
                id: r.id,
                type: r.reminderType,
                scheduledAt: r.scheduledAt,
                status: r.status,
            })));
            return existingReminders; // Return existing reminders instead of creating new ones
        }

        // Only schedule reminders that are in the future
        const now = new Date();
        const reminders: Array<{ reminderType: ReminderType; scheduledAt: Date }> = [];

        // ✅ UPDATE: Hanya schedule D-5, D-0, D+3, D+5
        if (d5BeforeDate >= now) reminders.push({ reminderType: 'D-5', scheduledAt: d5BeforeDate });
        if (d0Date >= now) reminders.push({ reminderType: 'D-0', scheduledAt: d0Date });
        if (d3AfterDate >= now) reminders.push({ reminderType: 'D+3', scheduledAt: d3AfterDate });
        if (d5AfterDate >= now) reminders.push({ reminderType: 'D+5', scheduledAt: d5AfterDate });

        // Create scheduled reminders in database
        // Use createMany with skipDuplicates if supported, or check before create
        const createdReminders = await Promise.all(
            reminders.map(async (reminder) => {
                // Double check sebelum create untuk prevent race condition
                const existing = await prisma.scheduledReminder.findFirst({
                    where: {
                        invoiceId,
                        reminderType: reminder.reminderType,
                        scheduledAt: {
                            // Check dalam rentang ±1 hari untuk handle timezone issues
                            gte: new Date(reminder.scheduledAt.getTime() - 24 * 60 * 60 * 1000),
                            lte: new Date(reminder.scheduledAt.getTime() + 24 * 60 * 60 * 1000),
                        },
                        status: { in: ['PENDING', 'SENT'] },
                    },
                });

                if (existing) {
                    console.log(`[Reminder Scheduler] Reminder ${reminder.reminderType} already exists for invoice ${invoiceId}, skipping`);
                    return existing;
                }

                return prisma.scheduledReminder.create({
                    data: {
                        invoiceId,
                        reminderType: reminder.reminderType,
                        scheduledAt: reminder.scheduledAt,
                        status: 'PENDING',
                    },
                });
            })
        );

        console.log(`[Reminder Scheduler] Scheduled ${createdReminders.length} reminders for invoice ${invoiceId}`);
        return createdReminders;
    } catch (error) {
        console.error(`[Reminder Scheduler] Error scheduling reminders for invoice ${invoiceId}:`, error);
        throw error;
    }
}

/**
 * Cancel all pending reminders for an invoice (e.g., when invoice is paid)
 */
export async function cancelPendingReminders(invoiceId: string) {
    try {
        const result = await prisma.scheduledReminder.updateMany({
            where: {
                invoiceId,
                status: 'PENDING',
            },
            data: {
                status: 'CANCELLED',
            },
        });

        console.log(`[Reminder Scheduler] Cancelled ${result.count} pending reminders for invoice ${invoiceId}`);
        return result;
    } catch (error) {
        console.error(`[Reminder Scheduler] Error cancelling reminders for invoice ${invoiceId}:`, error);
        throw error;
    }
}

/**
 * Get pending reminders that are due to be sent
 */
export async function getDueReminders(limit: number = 50) {
    const now = new Date();
    
    return await prisma.scheduledReminder.findMany({
        where: {
            status: 'PENDING',
            scheduledAt: {
                lte: now, // Due now or in the past
            },
        },
        include: {
            invoice: {
                include: {
                    user: true,
                },
            },
        },
        orderBy: {
            scheduledAt: 'asc',
        },
        take: limit,
    });
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(reminderId: string) {
    return await prisma.scheduledReminder.update({
        where: { id: reminderId },
        data: {
            status: 'SENT',
            sentAt: new Date(),
        },
    });
}

/**
 * Mark reminder as failed (for retry mechanism)
 * ✅ FIX: Jangan reschedule scheduledAt untuk prevent spam
 * Retry akan dilakukan oleh cron job berdasarkan retryCount, bukan scheduledAt baru
 */
export async function markReminderFailed(reminderId: string, error: string) {
    const reminder = await prisma.scheduledReminder.findUnique({
        where: { id: reminderId },
    });

    if (!reminder) {
        throw new Error('Reminder not found');
    }

    const retryCount = reminder.retryCount + 1;
    const maxRetries = 3;

    return await prisma.scheduledReminder.update({
        where: { id: reminderId },
        data: {
            status: retryCount >= maxRetries ? 'FAILED' : 'PENDING',
            retryCount,
            lastError: error,
            // ✅ FIX: Jangan update scheduledAt untuk prevent reschedule spam
            // Biarkan scheduledAt tetap sama, cron job akan retry berdasarkan retryCount
            scheduledAt: reminder.scheduledAt, // Keep original scheduledAt
        },
    });
}

