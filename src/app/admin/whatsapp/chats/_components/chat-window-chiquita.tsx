
"use client";

import { Send, Bot, User, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { EvolutionService } from "@/services/evolution-service";

export function ChatWindowChiquita({ selectedChat }: { selectedChat: any }) {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState("");
    const [isBotActive, setIsBotActive] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const socketRef = useRef<Socket | null>(null);

    // Configuration
    const socketUrl = "http://localhost:4000"; // Local socket server

    // 1. WebSocket Connection to Backend
    useEffect(() => {
        if (!selectedChat) return;

        // Connect to namespace /chat
        const socket = io(`${socketUrl}/chat`, {
            transports: ['websocket', 'polling']
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log("DEBUG: Socket connected", socket.id);
            if (selectedChat?.remoteJid) {
                socket.emit('joinRoom', selectedChat.remoteJid);
            }
        });

        socket.on('new_message', (msg: any) => {
            setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            scrollToBottom();
        });

        // Also listen to message_sent for our own messages
        socket.on('message_sent', (msg: any) => {
            setMessages(prev => {
                if (prev.some(m => m.id === msg.id)) return prev;
                return [...prev, msg];
            });
            scrollToBottom();
        });

        socket.on('bot_status', (data: { enabled: boolean }) => {
            setIsBotActive(data.enabled);
        });

        return () => {
            if (selectedChat?.remoteJid) {
                socket.emit('leaveRoom', selectedChat.remoteJid);
            }
            socket.disconnect();
        };
    }, [selectedChat]);

    // 2. Fetch Initial History
    useEffect(() => {
        if (!selectedChat) return;

        const loadData = async () => {
            try {
                const data = await EvolutionService.fetchMessages("", "", "", selectedChat.remoteJid);
                // Map to UI format
                const mapped = data.map((m: any) => ({
                    id: m.key.id,
                    sender: m.sender,
                    text: m.message?.conversation || m.message?.extendedTextMessage?.text || "[Media/Other]",
                    time: new Date(m.messageTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    raw: m
                })).reverse(); // Oldest first

                setMessages(mapped);
                scrollToBottom();

                // Fetch Bot Status? 
                // Currently defaults to true. Real implementation should fetch from DB.
            } catch (e) {
                console.error("Failed to load chat data", e);
            }
        };

        loadData();
    }, [selectedChat]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSend = async () => {
        if (!inputText.trim() || !selectedChat) return;

        const text = inputText;
        setInputText("");

        // Emit to socket server, which queues it in DB -> Worker -> WhatsApp
        socketRef.current?.emit('sendMessage', {
            remoteJid: selectedChat.remoteJid,
            message: text
        });
    };

    const toggleBot = () => {
        if (!selectedChat) return;
        const newState = !isBotActive;
        setIsBotActive(newState);
        socketRef.current?.emit('toggleBot', {
            remoteJid: selectedChat.remoteJid,
            enabled: newState
        });
    };

    if (!selectedChat) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-50 text-muted-foreground text-sm">
                Select a chat to start messaging
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50 relative">
            <div className={cn("absolute top-0 left-0 right-0 z-10 px-4 py-2 border-b flex items-center justify-between transition-colors", isBotActive ? "bg-slate-100/80 backdrop-blur" : "bg-red-50/90 backdrop-blur")}>
                <div className="flex items-center gap-2 text-sm">
                    {isBotActive ? (
                        <>
                            <div className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            <span className="font-medium text-slate-600">Bot is handling this chat</span>
                        </>
                    ) : (
                        <>
                            <ShieldAlert className="w-4 h-4 text-red-600" />
                            <span className="font-medium text-red-600">Human Control took over</span>
                        </>
                    )}
                </div>

                {isBotActive && (
                    <Button
                        size="sm"
                        variant="destructive"
                        className="h-7 text-xs shadow-md bg-gradient-to-r from-red-500 to-pink-600 border-0"
                        onClick={toggleBot}
                    >
                        TAKE OVER CONTROL
                    </Button>
                )}
                {!isBotActive && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                        onClick={toggleBot}
                    >
                        Resume Bot
                    </Button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-14">
                {messages.map((msg, idx) => {
                    const isBot = msg.sender === 'bot';
                    const isMe = msg.sender === 'admin' || isBot || msg.sender === 'ME';
                    const isCustomer = !isMe && msg.sender !== 'ME'; // Refine logic

                    return (
                        <div key={msg.id || idx} className={cn("flex w-full", !isCustomer ? "justify-end" : "justify-start")}>
                            <div className={cn("flex flex-col max-w-[70%]", !isCustomer ? "items-end" : "items-start")}>
                                <div className="flex items-center gap-1 mb-1 px-1">
                                    {isBot && <Bot size={12} className="text-slate-500" />}
                                    {isMe && !isBot && <User size={12} className="text-primary" />}
                                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                        {isCustomer ? 'Customer' : (isBot ? 'Bot' : 'You')}
                                    </span>
                                </div>
                                <div className={cn(
                                    "rounded-2xl px-4 py-2 text-sm shadow-md",
                                    isCustomer ? "bg-white text-gray-800 rounded-tl-none border border-slate-100" :
                                        isBot ? "bg-slate-200 text-slate-800 rounded-tr-none" :
                                            "bg-gradient-to-br from-primary to-purple-700 text-white rounded-tr-none"
                                )}>
                                    {msg.text}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1 px-1">
                                    {msg.time}
                                </span>
                            </div>
                        </div>
                    )
                })}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t">
                <div className="flex gap-2">
                    <Input
                        placeholder={isBotActive ? "Take over to type..." : "Type a message..."}
                        disabled={isBotActive}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        className="flex-1"
                    />
                    <Button size="icon" disabled={isBotActive || !inputText.trim()} onClick={handleSend} className={cn("transition-all", !isBotActive && inputText.trim() ? "scale-100 bg-primary" : "scale-90 bg-slate-300")}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
