import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/contacts/[id] - Get contact by ID
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const contact = await prisma.contact.findUnique({
            where: { id },
            include: {
                chat: {
                    select: {
                        id: true,
                        name: true,
                        jid: true,
                    }
                }
            }
        });

        if (!contact) {
            return NextResponse.json(
                { error: 'Contact not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ contact });
    } catch (error) {
        console.error('Error fetching contact:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contact' },
            { status: 500 }
        );
    }
}

// PUT /api/contacts/[id] - Update contact
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, phone, email, address, notes, tags, status } = body;

        // Check if contact exists
        const existingContact = await prisma.contact.findUnique({
            where: { id }
        });

        if (!existingContact) {
            return NextResponse.json(
                { error: 'Contact not found' },
                { status: 404 }
            );
        }

        // If phone is being changed, check for duplicates
        if (phone && phone !== existingContact.phone) {
            const duplicateContact = await prisma.contact.findUnique({
                where: { phone }
            });

            if (duplicateContact) {
                return NextResponse.json(
                    { error: 'Contact with this phone number already exists' },
                    { status: 409 }
                );
            }
        }

        const contact = await prisma.contact.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(phone && { phone }),
                ...(email !== undefined && { email }),
                ...(address !== undefined && { address }),
                ...(notes !== undefined && { notes }),
                ...(tags !== undefined && { tags }),
                ...(status && { status }),
            },
            include: {
                chat: {
                    select: {
                        id: true,
                        name: true,
                        jid: true,
                    }
                }
            }
        });

        return NextResponse.json({ contact });
    } catch (error: any) {
        console.error('Error updating contact:', error);
        
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Contact with this phone number already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update contact' },
            { status: 500 }
        );
    }
}

// DELETE /api/contacts/[id] - Delete contact
export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const contact = await prisma.contact.findUnique({
            where: { id }
        });

        if (!contact) {
            return NextResponse.json(
                { error: 'Contact not found' },
                { status: 404 }
            );
        }

        await prisma.contact.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting contact:', error);
        return NextResponse.json(
            { error: 'Failed to delete contact' },
            { status: 500 }
        );
    }
}

