import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoice } from '@/lib/invoice-generator';

/**
 * Test endpoint to create invoice for steven with past due date
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
                subscription: true,
            },
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                message: 'User "steven" not found',
            });
        }

        if (!user.subscription) {
            return NextResponse.json({
                success: false,
                message: 'User "steven" has no subscription',
            });
        }

        // Create invoice with dueDate = 3 Desember 2025 (past due)
        const dueDate = new Date('2025-12-03T00:00:00.000Z');
        
        const invoice = await generateInvoice({
            userId: user.id,
            type: 'MONTHLY',
            category: 'REGULAR_MONTHLY',
            amount: Number(user.subscription.price),
            dueDate: dueDate,
        });

        return NextResponse.json({
            success: true,
            message: 'Invoice created for steven',
            invoice: {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                amount: Number(invoice.amount),
                dueDate: invoice.dueDate,
                status: invoice.status,
            },
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
            },
        });
    } catch (error: any) {
        console.error('[Test Create Steven Invoice] Error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to create invoice', 
                message: error.message 
            },
            { status: 500 }
        );
    }
}

