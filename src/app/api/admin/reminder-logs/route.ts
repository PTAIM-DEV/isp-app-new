import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Get reminder logs for admin dashboard
 * Supports filtering by date range, status, reminder type, and customer
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        
        // Query parameters
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const status = searchParams.get('status'); // PENDING, SENT, FAILED, CANCELLED
        const reminderType = searchParams.get('reminderType'); // H-5, H-2, H-0, D+1, D+2, D+5
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const customerName = searchParams.get('customerName');
        const invoiceNumber = searchParams.get('invoiceNumber');

        // Build where clause
        const where: any = {};

        if (status) {
            where.status = status;
        }

        if (reminderType) {
            where.reminderType = reminderType;
        }

        if (startDate || endDate) {
            where.scheduledAt = {};
            if (startDate) {
                where.scheduledAt.gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.scheduledAt.lte = end;
            }
        }

        if (customerName || invoiceNumber) {
            where.invoice = {};
            if (invoiceNumber) {
                where.invoice.invoiceNumber = {
                    contains: invoiceNumber,
                    mode: 'insensitive',
                };
            }
            if (customerName) {
                where.invoice.user = {
                    name: {
                        contains: customerName,
                        mode: 'insensitive',
                    },
                };
            }
        }

        // Get total count
        const total = await prisma.scheduledReminder.count({ where });

        // Get reminders with pagination
        const reminders = await prisma.scheduledReminder.findMany({
            where,
            include: {
                invoice: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                scheduledAt: 'desc',
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        // Format response
        const logs = reminders.map(reminder => ({
            id: reminder.id,
            reminderType: reminder.reminderType,
            status: reminder.status,
            scheduledAt: reminder.scheduledAt,
            sentAt: reminder.sentAt,
            createdAt: reminder.createdAt,
            retryCount: reminder.retryCount,
            lastError: reminder.lastError,
            // Use optional chaining in case fields don't exist yet
            emailSent: (reminder as any).emailSent || false,
            whatsappSent: (reminder as any).whatsappSent || false,
            invoice: {
                id: reminder.invoice.id,
                invoiceNumber: reminder.invoice.invoiceNumber,
                amount: Number(reminder.invoice.amount),
                dueDate: reminder.invoice.dueDate,
                status: reminder.invoice.status,
            },
            customer: {
                id: reminder.invoice.user.id,
                name: reminder.invoice.user.name,
                phone: reminder.invoice.user.phone,
                email: reminder.invoice.user.email,
            },
        }));

        // Get statistics
        const stats = await Promise.all([
            prisma.scheduledReminder.count({ where: { status: 'PENDING' } }),
            prisma.scheduledReminder.count({ where: { status: 'SENT' } }),
            prisma.scheduledReminder.count({ where: { status: 'FAILED' } }),
            prisma.scheduledReminder.count({ where: { status: 'CANCELLED' } }),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                logs,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
                statistics: {
                    pending: stats[0],
                    sent: stats[1],
                    failed: stats[2],
                    cancelled: stats[3],
                    total: stats[0] + stats[1] + stats[2] + stats[3],
                },
            },
        });
    } catch (error: any) {
        console.error('[Admin Reminder Logs] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch reminder logs',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

