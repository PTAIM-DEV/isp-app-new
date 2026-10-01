import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/whatsapp/chats/[id]/save-contact - Save contact from chat
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, email, address, notes, tags } = body;

        // Get chat info
        const chat = await prisma.whatsAppChat.findUnique({
            where: { id }
        });

        if (!chat) {
            return NextResponse.json(
                { error: 'Chat not found' },
                { status: 404 }
            );
        }

        // Extract phone number from JID
        const phone = chat.jid.split('@')[0];

        // Check if contact already exists
        const existingContact = await prisma.contact.findUnique({
            where: { phone }
        });

        if (existingContact) {
            // Update existing contact
            const contact = await prisma.contact.update({
                where: { id: existingContact.id },
                data: {
                    ...(name && { name }),
                    ...(email !== undefined && { email }),
                    ...(address !== undefined && { address }),
                    ...(notes !== undefined && { notes }),
                    ...(tags && { tags }),
                    chatId: id, // Link to chat
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

            return NextResponse.json({ contact, isNew: false });
        }

        // Create new contact
        const contact = await prisma.contact.create({
            data: {
                name: name || chat.name || phone,
                phone,
                email,
                address,
                notes,
                tags: tags || [],
                source: 'WHATSAPP_CHAT',
                sourceId: id,
                chatId: id,
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

        return NextResponse.json({ contact, isNew: true }, { status: 201 });
    } catch (error: any) {
        console.error('Error saving contact:', error);
        
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Contact with this phone number already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to save contact' },
            { status: 500 }
        );
    }
}

