import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Check reminder logs for steven's invoice
 */
export async function GET() {
    try {
        // Find user steven
        const user = await prisma.user.findFirst({
            where: {
                name: {
                    contains: 'steven',
                    mode: 'insensitive',
                },
            },
            include: {
                invoices: {
                    include: {
                        scheduledReminders: {
                            orderBy: { createdAt: 'desc' },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                message: 'User "steven" not found',
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        // Check all reminders for steven's invoices
        const reminders = user.invoices.flatMap(inv => 
            inv.scheduledReminders.map(rem => ({
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                invoiceStatus: inv.status,
                invoiceDeletedAt: inv.deletedAt,
                reminderId: rem.id,
                reminderType: rem.reminderType,
                status: rem.status,
                scheduledAt: rem.scheduledAt,
                sentAt: rem.sentAt,
                emailSent: rem.emailSent,
                whatsappSent: rem.whatsappSent,
                isToday: rem.sentAt && rem.sentAt >= today && rem.sentAt <= todayEnd,
            }))
        );

        // Check D+1 reminders specifically
        const d1Reminders = reminders.filter(r => r.reminderType === 'D+1');
        const d1RemindersToday = d1Reminders.filter(r => r.isToday);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
            },
            invoices: user.invoices.map(inv => ({
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                status: inv.status,
                deletedAt: inv.deletedAt,
                dueDate: inv.dueDate,
            })),
            reminders: {
                total: reminders.length,
                d1: {
                    total: d1Reminders.length,
                    today: d1RemindersToday.length,
                    sent: d1Reminders.filter(r => r.status === 'SENT').length,
                    pending: d1Reminders.filter(r => r.status === 'PENDING').length,
                    failed: d1Reminders.filter(r => r.status === 'FAILED').length,
                },
                all: reminders,
            },
        });
    } catch (error: any) {
        console.error('[Check Steven Reminders] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to check reminders',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

