import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Restore soft-deleted invoice
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Check if invoice exists and is deleted
        const invoice = await prisma.invoice.findUnique({
            where: { id },
        });

        if (!invoice) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invoice not found',
                },
                { status: 404 }
            );
        }

        if (!invoice.deletedAt) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invoice is not deleted',
                },
                { status: 400 }
            );
        }

        // Restore invoice (set deletedAt to null)
        await prisma.invoice.update({
            where: { id },
            data: {
                deletedAt: null,
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Invoice restored successfully',
            data: {
                invoice: {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    status: invoice.status,
                },
            },
        });
    } catch (error: any) {
        console.error('[Admin Restore Invoice] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to restore invoice',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

