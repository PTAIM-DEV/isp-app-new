import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Test endpoint to check scheduled reminders for steven's invoice
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
                            orderBy: { scheduledAt: 'asc' },
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

        const allReminders = user.invoices.flatMap(inv => 
            inv.scheduledReminders.map(rem => ({
                id: rem.id,
                invoiceId: inv.id,
                invoiceNumber: inv.invoiceNumber,
                reminderType: rem.reminderType,
                scheduledAt: rem.scheduledAt,
                status: rem.status,
                createdAt: rem.createdAt,
            }))
        );

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
                dueDate: inv.dueDate,
                status: inv.status,
                remindersCount: inv.scheduledReminders.length,
            })),
            scheduledReminders: {
                total: allReminders.length,
                all: allReminders,
                pending: allReminders.filter(r => r.status === 'PENDING'),
                sent: allReminders.filter(r => r.status === 'SENT'),
                failed: allReminders.filter(r => r.status === 'FAILED'),
            },
        });
    } catch (error: any) {
        console.error('[Test Check Scheduled Reminders] Error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to check scheduled reminders', 
                message: error.message 
            },
            { status: 500 }
        );
    }
}

