import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Check detailed invoice information for steven including deletedAt
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

        // Check all invoices including deleted ones
        const allInvoices = user.invoices.map(inv => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: Number(inv.amount),
            dueDate: inv.dueDate,
            status: inv.status,
            createdAt: inv.createdAt,
            deletedAt: inv.deletedAt,
            isDeleted: inv.deletedAt !== null,
        }));

        // Check invoices that are NOT deleted
        const activeInvoices = user.invoices.filter(inv => inv.deletedAt === null);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
            },
            invoices: {
                total: user.invoices.length,
                active: activeInvoices.length,
                deleted: user.invoices.length - activeInvoices.length,
                all: allInvoices,
            },
        });
    } catch (error: any) {
        console.error('[Check Steven Invoices Detail] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to check invoices',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

