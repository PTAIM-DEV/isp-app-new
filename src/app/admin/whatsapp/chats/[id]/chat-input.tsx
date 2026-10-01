'use client';

import { useState } from 'react';
import { Paperclip, Send, Smile } from 'lucide-react';
import { sendMessage } from './actions';

interface ChatInputProps {
    chatId: string;
    onMessageSent?: () => void;
}

export default function ChatInput({ chatId, onMessageSent }: ChatInputProps) {
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async () => {
        if (!message.trim() || sending) return;

        const messageContent = message.trim();
        setSending(true);
        
        try {
            const result = await sendMessage(chatId, messageContent);
            if (result.success) {
                setMessage('');
                // Trigger refresh of messages list
                if (onMessageSent) {
                    onMessageSent();
                }
                // Also trigger a small delay refresh to ensure message is synced
                setTimeout(() => {
                    if (onMessageSent) {
                        onMessageSent();
                    }
                }, 1000);
            } else {
                alert(result.error || 'Gagal mengirim pesan');
            }
        } catch (error) {
            console.error('Failed to send:', error);
            alert('Gagal mengirim pesan');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="h-16 bg-white px-4 flex items-center space-x-4 shrink-0 border-t border-gray-200">
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
                <Smile className="w-5 h-5" />
            </button>
            <button className="text-gray-500 hover:text-gray-700 transition-colors">
                <Paperclip className="w-5 h-5" />
            </button>

            <div className="flex-1">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ketik pesan"
                    className="w-full py-2.5 px-4 bg-gray-50 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm text-gray-900 placeholder-gray-500 transition-all"
                    disabled={sending}
                />
            </div>

            <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className={`p-2 rounded-lg transition-colors ${
                    message.trim() 
                        ? 'text-purple-600 hover:bg-purple-50' 
                        : 'text-gray-400 cursor-not-allowed'
                }`}
            >
                <Send className="w-5 h-5" />
            </button>
        </div>
    );
}
