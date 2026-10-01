import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const chats = await prisma.whatsAppChat.findMany({
            where: {
                AND: [
                    { jid: { not: 'status@broadcast' } },
                    { jid: { not: { endsWith: '@newsletter' } } }
                ]
            },
            orderBy: { lastMsg: 'desc' },
            include: {
                messages: {
                    take: 1,
                    orderBy: { createdAt: 'desc' }
                }
            }
        });

        return NextResponse.json({ chats });
    } catch (error) {
        console.error('Error fetching chats:', error);
        return NextResponse.json(
            { error: 'Failed to fetch chats' },
            { status: 500 }
        );
    }
}




