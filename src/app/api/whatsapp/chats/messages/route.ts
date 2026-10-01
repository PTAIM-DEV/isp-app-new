
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const jid = searchParams.get('jid');

    if (!jid) {
        return NextResponse.json({ error: 'JID is required' }, { status: 400 });
    }

    try {
        const chat = await prisma.whatsAppChat.findUnique({
            where: { jid },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 50
                }
            }
        });

        if (!chat) {
            return NextResponse.json({ messages: [] });
        }

        // Map to Evolution format expected by UI
        const messages = chat.messages.map(m => ({
            key: {
                id: m.id,
                fromMe: m.sender === 'ME' || m.sender === 'admin' || m.sender === 'bot',
                remoteJid: jid
            },
            message: {
                conversation: m.content
            },
            messageTimestamp: Math.floor(m.createdAt.getTime() / 1000),
            pushName: m.sender,
            sender: m.sender === 'ME' ? 'admin' : (m.sender === 'bot' ? 'bot' : 'customer') // refine
        })); // .reverse() is done in UI usually, but let's see. 
        // EvolutionService.ts usually returns them raw.

        return NextResponse.json({ messages });
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
