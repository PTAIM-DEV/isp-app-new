import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function calculateAging(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;

        // Get user info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                salesPerson: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                subscription: {
                    include: {
                        // Package info
                    },
                },
                province: { select: { name: true } },
                city: { select: { name: true } },
                district: { select: { name: true } },
                village: { select: { name: true } },
            },
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: 'User not found' },
                { status: 404 }
            );
        }

        // Get all receivables for this user
        const receivables = await prisma.invoice.findMany({
            where: {
                userId,
                status: { in: ['UNPAID', 'OVERDUE', 'EXPIRED'] },
                deletedAt: null,
                collectionStatus: { not: 'WRITE_OFF' },
            },
            include: {
                paymentTransactions: {
                    orderBy: { createdAt: 'desc' },
                    take: 5, // Last 5 transactions
                },
                scheduledReminders: {
                    orderBy: { createdAt: 'desc' },
                    take: 10, // Last 10 reminders
                },
            },
            orderBy: { dueDate: 'asc' },
        });

        // Calculate aging for each invoice
        const processedReceivables = receivables.map((inv) => ({
            ...inv,
            aging: calculateAging(inv.dueDate),
        }));

        // Calculate summary
        const totalReceivable = processedReceivables.reduce(
            (sum, inv) => sum + Number(inv.amount),
            0
        );

        const oldestInvoice = processedReceivables.length > 0
            ? processedReceivables.reduce((oldest, inv) =>
                inv.aging > oldest.aging ? inv : oldest
            )
            : null;

        const averageAging = processedReceivables.length > 0
            ? processedReceivables.reduce((sum, inv) => sum + inv.aging, 0) / processedReceivables.length
            : 0;

        // Get payment history (paid invoices)
        const paymentHistory = await prisma.invoice.findMany({
            where: {
                userId,
                status: 'PAID',
                deletedAt: null,
            },
            orderBy: { paidAt: 'desc' },
            take: 10,
        });

        return NextResponse.json({
            success: true,
            data: {
                user,
                receivables: processedReceivables,
                summary: {
                    totalReceivable,
                    invoiceCount: processedReceivables.length,
                    oldestInvoice: oldestInvoice ? {
                        id: oldestInvoice.id,
                        invoiceNumber: oldestInvoice.invoiceNumber,
                        amount: Number(oldestInvoice.amount),
                        dueDate: oldestInvoice.dueDate,
                        aging: oldestInvoice.aging,
                    } : null,
                    averageAging: Math.round(averageAging),
                },
                paymentHistory,
            },
        });
    } catch (error: any) {
        console.error('Error fetching customer receivables:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

