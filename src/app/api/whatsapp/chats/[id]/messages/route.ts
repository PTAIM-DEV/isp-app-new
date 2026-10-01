import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const searchParams = request.nextUrl.searchParams;
        const lastMessageId = searchParams.get('lastMessageId');

        const chat = await prisma.whatsAppChat.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                    ...(lastMessageId && {
                        where: {
                            id: {
                                gt: lastMessageId
                            }
                        }
                    })
                }
            }
        });

        if (!chat) {
            return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
        }

        return NextResponse.json({
            messages: chat.messages,
            lastMessageId: chat.messages.length > 0 
                ? chat.messages[chat.messages.length - 1].id 
                : null
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}




