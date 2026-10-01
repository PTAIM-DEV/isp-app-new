import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Delete invoice (soft delete)
 */
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Soft delete invoice
        await prisma.invoice.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
        });

        return NextResponse.json({
            success: true,
            message: 'Invoice deleted successfully',
        });
    } catch (error: any) {
        console.error('[Admin Delete Invoice] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to delete invoice',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

