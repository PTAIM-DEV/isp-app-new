'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function sendMessage(chatId: string, content: string) {
    try {
        const chat = await prisma.whatsAppChat.findUnique({
            where: { id: chatId }
        });

        if (!chat) {
            throw new Error('Chat not found');
        }

        // Save message immediately to database (optimistic update)
        // This allows the message to appear instantly in the UI
        const message = await prisma.whatsAppMessage.create({
            data: {
                chat: { connect: { id: chatId } },
                sender: 'ME',
                content,
                type: 'text',
                createdAt: new Date()
            }
        });

        // Update chat's lastMsg timestamp
        await prisma.whatsAppChat.update({
            where: { id: chatId },
            data: { lastMsg: new Date() }
        });

        // Queue message for sending via WhatsApp
        await prisma.whatsAppOutgoing.create({
            data: {
                jid: chat.jid,
                content,
                status: 'PENDING'
            }
        });

        revalidatePath(`/admin/whatsapp/chats/${chatId}`);
        return { success: true, messageId: message.id };
    } catch (error) {
        console.error('Failed to send message:', error);
        return { success: false, error: 'Failed to send message' };
    }
}
