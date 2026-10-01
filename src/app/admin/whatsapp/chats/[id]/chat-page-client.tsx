
'use client';

import { ChatWindowChiquita } from '../_components/chat-window-chiquita';

interface ChatPageClientProps {
    chatId: string;
    chatName: string;
    chatJid: string;
    initialMessages: any[]; // We can relax this type as ChatWindow handles fetching too
}

export default function ChatPageClient({ chatId, chatName, chatJid, initialMessages }: ChatPageClientProps) {
    // We construct the "selectedChat" object expected by ChatWindowChiquita
    const selectedChat = {
        remoteJid: chatJid,
        name: chatName,
        // other fields if needed
    };

    return (
        <div className="h-full w-full">
            <ChatWindowChiquita selectedChat={selectedChat} />
        </div>
    );
}
