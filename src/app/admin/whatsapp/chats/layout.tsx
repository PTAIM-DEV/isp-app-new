import { prisma } from '@/lib/prisma';
import { Search, MessageSquarePlus, MoreVertical } from 'lucide-react';
import ChatList from './chat-list';
import ResizableChatsLayout from './resizable-chats-layout';
import { Children, isValidElement } from 'react';

export const dynamic = 'force-dynamic';

export default async function ChatsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
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

    return (
        <ResizableChatsLayout
            sidebar={
                <>
                    {/* Search Bar */}
                    <div className="p-3 bg-white border-b border-gray-200 shrink-0">
                        <div className="relative bg-gray-100 rounded-lg">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-500" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 bg-transparent border-none focus:ring-0 text-sm text-gray-900 placeholder-gray-500"
                                placeholder="Cari percakapan"
                            />
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex border-b border-gray-200 bg-white shrink-0">
                        <button className="flex-1 px-4 py-2 text-sm font-medium text-purple-600 border-b-2 border-purple-600">
                            Semua
                        </button>
                        <button className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-purple-600">
                            Belum Dibaca
                        </button>
                        <button className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-purple-600">
                            Grup
                        </button>
                    </div>

                    {/* Chat List */}
                    <ChatList initialChats={chats.map(chat => ({
                        ...chat,
                        lastMsg: chat.lastMsg
                    }))} />
                </>
            }
        >
            {children}
        </ResizableChatsLayout>
    );
}
