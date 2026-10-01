import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type CollectionStatus = 'NOT_COLLECTED' | 'COLLECTING' | 'PENDING_CONFIRMATION' | 'DISPUTE' | 'WRITE_OFF';

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ invoiceId: string }> }
) {
    try {
        const { invoiceId } = await params;
        const body = await request.json();
        const { collectionStatus, collectionNotes } = body;

        if (!collectionStatus) {
            return NextResponse.json(
                { success: false, error: 'collectionStatus is required' },
                { status: 400 }
            );
        }

        const validStatuses: CollectionStatus[] = [
            'NOT_COLLECTED',
            'COLLECTING',
            'PENDING_CONFIRMATION',
            'DISPUTE',
            'WRITE_OFF',
        ];

        if (!validStatuses.includes(collectionStatus)) {
            return NextResponse.json(
                { success: false, error: 'Invalid collectionStatus' },
                { status: 400 }
            );
        }

        // Check if invoice exists
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        // Update invoice
        const updated = await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                collectionStatus: collectionStatus as CollectionStatus,
                collectionNotes: collectionNotes || null,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    },
                },
            },
        });

        return NextResponse.json({
            success: true,
            data: updated,
        });
    } catch (error: any) {
        console.error('Error updating collection status:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

