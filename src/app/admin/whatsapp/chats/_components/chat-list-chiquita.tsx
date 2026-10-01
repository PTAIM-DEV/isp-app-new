
"use client";

import { useState, useEffect } from "react";
import { Search, Bot, User, Trash as TrashIcon, MessageSquare as MessageSquareIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EvolutionService } from "@/services/evolution-service";

function BadgeMock({ children, className, variant = "default" }: any) {
    const variants: any = {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        outline: "border border-input bg-background",
    }
    return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", variants[variant], className)}>{children}</span>
}

export function ChatListChiquita({ onSelectChat }: { onSelectChat: (chat: any) => void }) {
    const [filter, setFilter] = useState("all");
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection Mode State
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedJids, setSelectedJids] = useState<string[]>([]);

    const fetchChats = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            // Using internal API wrapper
            const data = await EvolutionService.fetchChats("", "", "");

            // Transform to UI format (if EvolutionService didn't already fully do it)
            // EvolutionService now returns mapped structure: { remoteJid, name, unreadCount, lastMessage, id }

            const mapped = data.map((c: any) => {
                // Determine status based on unread or other flags?
                // In Chiquita: (c.unreadCount > 0) ? "human_needed" : "bot_handling"
                // Real logic should use 'handedToHuman' from DB if available.
                // For now, heuristic is fine or we fetch 'handedToHuman' in list.
                // Let's assume heuristic for now to match visual.
                const status = c.unreadCount > 0 ? "human_needed" : "bot_handling";

                return {
                    id: c.remoteJid, // UI uses remoteJid as ID often
                    remoteJid: c.remoteJid,
                    name: c.name || `+${c.remoteJid.split('@')[0]}`,
                    lastMsg: c.lastMessage?.message?.conversation || "Image/Media",
                    time: c.lastMessage?.messageTimestamp ? new Date(c.lastMessage?.messageTimestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "",
                    status: status,
                    unread: c.unreadCount || 0,
                    avatar: (c.name || "U").charAt(0).toUpperCase()
                };
            });

            setChats(mapped);
        } catch (e) {
            console.error("Failed to fetch chats", e);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchChats();
        const interval = setInterval(() => fetchChats(true), 3000);
        return () => clearInterval(interval);
    }, []);

    const filtered = chats.filter(c =>
        filter === "all" ? true :
            filter === "human" ? c.status === "human_needed" :
                c.status === "bot_handling"
    );

    const toggleSelection = (jid: string) => {
        if (selectedJids.includes(jid)) {
            setSelectedJids(selectedJids.filter(id => id !== jid));
        } else {
            setSelectedJids([...selectedJids, jid]);
        }
    };

    return (
        <div className="flex flex-col h-full border-r bg-card/50">
            <div className="p-4 border-b space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <MessageSquareIcon className="w-5 h-5 text-primary" />
                    Live Chats

                    <div className="ml-auto flex items-center gap-2">
                        <button
                            className={cn("text-xs flex items-center gap-1 transition-colors", isSelectionMode ? "text-primary font-bold" : "text-muted-foreground hover:text-foreground")}
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                setSelectedJids([]);
                            }}
                        >
                            {isSelectionMode ? "Cancel" : "Select"}
                        </button>
                    </div>
                </h3>

                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input type="search" placeholder="Search chats..." className="pl-9" />
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter("all")}
                        className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", filter === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter("bot")}
                        className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", filter === "bot" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                    >
                        Bot
                    </button>
                    <button
                        onClick={() => setFilter("human")}
                        className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", filter === "human" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80")}
                    >
                        Needs Human
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading && chats.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">Loading chats...</div>}
                {!loading && filtered.length === 0 && <div className="p-4 text-center text-sm text-muted-foreground">No chats found.</div>}

                {filtered.map((chat) => (
                    <div
                        key={chat.remoteJid}
                        onClick={() => {
                            if (isSelectionMode) {
                                toggleSelection(chat.remoteJid);
                            } else {
                                onSelectChat(chat);
                            }
                        }}
                        className={cn(
                            "p-4 border-b cursor-pointer transition-colors relative group",
                            isSelectionMode && selectedJids.includes(chat.remoteJid) ? "bg-primary/10 hover:bg-primary/15" : "hover:bg-accent/50"
                        )}
                    >
                        <div className="flex items-start gap-3">
                            {isSelectionMode && (
                                <div className="flex items-center justify-center self-center mr-1">
                                    <div className={cn("w-4 h-4 rounded border flex items-center justify-center transition-colors", selectedJids.includes(chat.remoteJid) ? "bg-primary border-primary" : "border-muted-foreground")}>
                                        {selectedJids.includes(chat.remoteJid) && <div className="w-2 h-2 bg-white rounded-sm" />}
                                    </div>
                                </div>
                            )}

                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm shadow-sm ring-2 ring-white">
                                {chat.avatar}
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-semibold text-sm truncate">{chat.name}</span>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{chat.time}</span>
                                </div>
                                <p className="text-xs text-muted-foreground truncate font-medium">
                                    {chat.lastMsg}
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                    {chat.status === 'bot_handling' ?
                                        <BadgeMock variant="secondary" className="text-[10px] py-0 h-5 px-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                            <Bot className="w-3 h-3 mr-1" /> Bot
                                        </BadgeMock> :
                                        <BadgeMock variant="secondary" className="text-[10px] py-0 h-5 px-2 bg-amber-100 text-amber-700 hover:bg-amber-100">
                                            <User className="w-3 h-3 mr-1" /> Human
                                        </BadgeMock>
                                    }
                                </div>
                            </div>
                            {chat.unread > 0 && (
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold shadow-sm">
                                    {chat.unread}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
