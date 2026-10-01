'use client';

import { useEffect, useState, useRef } from 'react';
import { formatDate } from '@/lib/utils';
import { Trash2 } from 'lucide-react';


interface Message {
    id: string;
    sender: string;
    content: string;
    mediaUrl: string | null;
    type: string;
    createdAt: Date | string;
}

interface MessagesListProps {
    chatId: string;
    initialMessages: Message[];
    refreshTrigger?: number; // Add refresh trigger prop
}

export default function MessagesList({ chatId, initialMessages, refreshTrigger }: MessagesListProps) {
    // Deduplicate initial messages
    const uniqueInitialMessages = initialMessages.filter((v, i, a) =>
        a.findIndex(t => t.id === v.id) === i
    );

    const [messages, setMessages] = useState<Message[]>(uniqueInitialMessages);
    const [lastMessageId, setLastMessageId] = useState<string | null>(
        uniqueInitialMessages.length > 0 ? uniqueInitialMessages[uniqueInitialMessages.length - 1].id : null
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isPolling, setIsPolling] = useState(true);

    // Refresh messages when refreshTrigger changes
    useEffect(() => {
        const refreshMessages = async () => {
            try {
                const response = await fetch(`/api/whatsapp/chats/${chatId}/messages`, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                });

                if (!response.ok) return;

                const data = await response.json();
                if (data.messages) {
                    // Deduplicate messages
                    const uniqueMessages = data.messages.filter((v: Message, i: number, a: Message[]) =>
                        a.findIndex(t => t.id === v.id) === i
                    );
                    setMessages(uniqueMessages);
                    if (uniqueMessages.length > 0) {
                        setLastMessageId(uniqueMessages[uniqueMessages.length - 1].id);
                    }
                }
            } catch (error) {
                console.error('Error refreshing messages:', error);
            }
        };

        if (refreshTrigger !== undefined) {
            refreshMessages();
        }
    }, [chatId, refreshTrigger]);

    const handleDeleteMessage = async (messageId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus pesan ini?')) return;

        try {
            const response = await fetch(`/api/whatsapp/messages/${messageId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setMessages(prev => prev.filter(m => m.id !== messageId));
            } else {
                alert('Gagal menghapus pesan');
            }
        } catch (error) {
            console.error('Error deleting message:', error);
            alert('Terjadi kesalahan saat menghapus pesan');
        }
    };

    // Auto-scroll to bottom when new messages arrive
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Poll for new messages
    useEffect(() => {
        if (!isPolling) return;

        const pollMessages = async () => {
            try {
                const url = `/api/whatsapp/chats/${chatId}/messages${lastMessageId ? `?lastMessageId=${lastMessageId}` : ''}`;
                const response = await fetch(url, {
                    cache: 'no-store',
                    headers: {
                        'Cache-Control': 'no-cache',
                    }
                });

                if (!response.ok) return;

                const data = await response.json();

                if (data.messages && data.messages.length > 0) {
                    // Deduplicate new messages before adding
                    const uniqueNewMessages = data.messages.filter((v: Message, i: number, a: Message[]) =>
                        a.findIndex(t => t.id === v.id) === i
                    );

                    setMessages(prev => {
                        // Combine and deduplicate all messages
                        const combined = [...prev, ...uniqueNewMessages];
                        return combined.filter((v, i, a) =>
                            a.findIndex(t => t.id === v.id) === i
                        );
                    });
                    setLastMessageId(data.lastMessageId);
                }
            } catch (error) {
                console.error('Error polling messages:', error);
            }
        };

        // Poll every 2 seconds
        const interval = setInterval(pollMessages, 2000);

        return () => clearInterval(interval);
    }, [chatId, lastMessageId, isPolling]);

    // Refresh messages when page becomes visible (user switches back to tab)
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // Refresh immediately when tab becomes visible
                fetch(`/api/whatsapp/chats/${chatId}/messages`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.messages) {
                            // Deduplicate messages
                            const uniqueMessages = data.messages.filter((v: Message, i: number, a: Message[]) =>
                                a.findIndex(t => t.id === v.id) === i
                            );
                            setMessages(uniqueMessages);
                            if (uniqueMessages.length > 0) {
                                setLastMessageId(uniqueMessages[uniqueMessages.length - 1].id);
                            }
                        }
                    })
                    .catch(err => console.error('Error refreshing messages:', err));
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [chatId]);

    // Final deduplication before rendering
    const uniqueMessages = messages.filter((v, i, a) =>
        a.findIndex(t => t.id === v.id) === i
    );

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
            {uniqueMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'ME' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${msg.sender === 'ME'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-800'
                        } shadow-sm group relative`}>
                        <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className={`absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${msg.sender === 'ME' ? 'hover:bg-purple-700 text-purple-200' : 'hover:bg-gray-100 text-gray-400'
                                }`}
                            title="Hapus Pesan"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                        {msg.mediaUrl && (
                            <div className="mb-2">
                                {msg.type === 'image' && (
                                    <img src={msg.mediaUrl} alt="Image" className="rounded-lg max-w-full h-auto" />
                                )}
                                {msg.type === 'sticker' && (
                                    <img src={msg.mediaUrl} alt="Sticker" className="w-32 h-auto" />
                                )}
                                {msg.type === 'video' && (
                                    <video src={msg.mediaUrl} controls className="rounded-lg max-w-full h-auto" />
                                )}
                                {msg.type === 'audio' && (
                                    <audio src={msg.mediaUrl} controls className="w-full" />
                                )}
                                {msg.type === 'document' && (
                                    <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center space-x-2 hover:underline p-2 rounded ${msg.sender === 'ME' ? 'text-purple-100 bg-purple-700' : 'text-purple-600 bg-gray-100'
                                        }`}>
                                        <span>📄 Download Document</span>
                                    </a>
                                )}
                            </div>
                        )}
                        <p className={`text-sm whitespace-pre-wrap break-words ${msg.sender === 'ME' ? 'text-white' : 'text-gray-800'
                            }`}>{msg.content}</p>
                        <p className={`text-[10px] mt-1 ${msg.sender === 'ME' ? 'text-purple-100' : 'text-gray-500'
                            } ${msg.sender === 'ME' ? 'text-right' : 'text-left'}`}>
                            {formatDate(msg.createdAt instanceof Date ? msg.createdAt : new Date(msg.createdAt))}
                        </p>
                    </div>
                </div>
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
}

