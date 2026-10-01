'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { Users } from 'lucide-react';

interface Chat {
    id: string;
    jid: string;
    name: string | null;
    unread: number;
    lastMsg: Date | string;
    messages: Array<{
        content: string;
    }>;
}

interface ChatListProps {
    initialChats: Chat[];
}

export default function ChatList({ initialChats }: ChatListProps) {
    const [chats, setChats] = useState<Chat[]>(initialChats);
    const pathname = usePathname();

    // Poll for new chats
    useEffect(() => {
        const pollChats = async () => {
            try {
                const response = await fetch('/api/whatsapp/chats/list', {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                });

                if (!response.ok) return;

                const data = await response.json();
                if (data.chats) {
                    setChats(data.chats);
                }
            } catch (error) {
                console.error('Error polling chats:', error);
            }
        };

        // Poll every 3 seconds
        const interval = setInterval(pollChats, 3000);

        return () => clearInterval(interval);
    }, []);

    // Refresh when page becomes visible
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetch('/api/whatsapp/chats/list')
                    .then(res => res.json())
                    .then(data => {
                        if (data.chats) {
                            setChats(data.chats);
                        }
                    })
                    .catch(err => console.error('Error refreshing chats:', err));
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return (
        <div className="flex-1 overflow-y-auto">
            {chats.map((chat) => {
                const isActive = pathname === `/admin/whatsapp/chats/${chat.id}`;
                return (
                    <Link key={chat.id} href={`/admin/whatsapp/chats/${chat.id}`}>
                        <div className={`flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 relative ${isActive ? 'bg-purple-50' : ''}`}>
                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-600"></div>
                            )}
                            
                            {/* Avatar */}
                            <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-lg font-medium mr-3 ${
                                isActive ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'
                            }`}>
                                {chat.jid.endsWith('@g.us') ? (
                                    <Users className="w-6 h-6" />
                                ) : (
                                    chat.name ? chat.name[0].toUpperCase() : '#'
                                )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className={`text-base font-medium truncate ${
                                        isActive ? 'text-purple-900' : 'text-gray-900'
                                    }`}>
                                        {chat.name || chat.jid}
                                    </h4>
                                    <span className="text-xs text-gray-500 ml-2">
                                        {formatDate(chat.lastMsg)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-gray-500 truncate pr-2">
                                        {chat.messages[0]?.content || 'Belum ada pesan'}
                                    </p>
                                    {chat.unread > 0 && (
                                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-purple-600 rounded-full">
                                            {chat.unread}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Link>
                );
            })}
            {chats.length === 0 && (
                <div className="p-8 text-center text-gray-500 text-sm">
                    Belum ada percakapan.
                </div>
            )}
        </div>
    );
}




