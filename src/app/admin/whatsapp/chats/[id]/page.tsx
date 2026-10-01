import { prisma } from '@/lib/prisma';
import ChatPageClient from './chat-page-client';
import CustomerContextPanel from './customer-context-panel';
import ResizableChatLayout from './resizable-layout';

interface PageProps {
    params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ChatDetailPage({ params }: PageProps) {
    const { id } = await params;

    // Try to find by ID (UUID) or JID
    let chat = await prisma.whatsAppChat.findUnique({
        where: { id },
        include: {
            messages: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    if (!chat) {
        // Fallback: Try to find by JID (since URL might be JID)
        chat = await prisma.whatsAppChat.findUnique({
            where: { jid: decodeURIComponent(id) },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });
    }

    if (!chat) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="mb-4">Chat not found</p>
                <a href="/admin/whatsapp/chats" className="text-primary hover:underline">
                    Return to Chat List
                </a>
            </div>
        );
    }

    const chatName = chat.name || chat.jid;

    return (
        <ResizableChatLayout
            sidebar={<CustomerContextPanel chatJid={chat.jid} chatName={chatName} />}
        >
            <ChatPageClient
                chatId={chat.id}
                chatName={chatName}
                chatJid={chat.jid}
                initialMessages={chat.messages.map(msg => ({
                    ...msg,
                    createdAt: msg.createdAt
                }))}
            />
        </ResizableChatLayout>
    );
}
