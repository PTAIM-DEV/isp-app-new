import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPaymentReminder } from '@/lib/payment-reminder';

/**
 * Test endpoint to send reminder to steven for D+1
 */
export async function POST() {
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
                    where: {
                        status: { in: ['UNPAID', 'OVERDUE'] },
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                message: 'User "steven" not found',
            });
        }

        if (user.invoices.length === 0) {
            return NextResponse.json({
                success: false,
                message: 'No unpaid invoice found for steven',
            });
        }

        const invoice = user.invoices[0];

        // Calculate days overdue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(invoice.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

        // Determine reminder type based on days overdue (using new types: D-5, D-0, D+3, D+5)
        let reminderType: 'D-5' | 'D-0' | 'D+3' | 'D+5' = 'D+3';
        
        if (daysOverdue === -5) {
            reminderType = 'D-5';
        } else if (daysOverdue === 0) {
            reminderType = 'D-0';
        } else if (daysOverdue === 3) {
            reminderType = 'D+3';
        } else if (daysOverdue >= 5) {
            reminderType = 'D+5';
        }

        console.log(`[Test Send Steven Reminder] Invoice: ${invoice.invoiceNumber}, Days Overdue: ${daysOverdue}, Reminder Type: ${reminderType}`);

        // Send reminder
        const result = await sendPaymentReminder(invoice.id, reminderType);

        // Create or update scheduled reminder record
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        let reminderRecord = await prisma.scheduledReminder.findFirst({
            where: {
                invoiceId: invoice.id,
                reminderType,
                scheduledAt: {
                    gte: todayStart,
                    lte: todayEnd,
                },
            },
        });

        if (!reminderRecord) {
            reminderRecord = await prisma.scheduledReminder.create({
                data: {
                    invoiceId: invoice.id,
                    reminderType,
                    scheduledAt: new Date(),
                    status: 'PENDING',
                },
            });
        }

        // Update reminder status
        if (result.email || result.whatsapp) {
            await prisma.scheduledReminder.update({
                where: { id: reminderRecord.id },
                data: {
                    status: 'SENT',
                    sentAt: new Date(),
                },
            });
        }

        return NextResponse.json({
            success: true,
            message: `Reminder ${reminderType} sent to steven`,
            invoice: {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                amount: Number(invoice.amount),
                dueDate: invoice.dueDate,
                daysOverdue,
            },
            customer: {
                name: user.name,
                phone: user.phone,
                email: user.email,
            },
            reminder: {
                type: reminderType,
                whatsapp: result.whatsapp,
                email: result.email,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[Test Send Steven Reminder] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to send reminder',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

