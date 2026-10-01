'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChatListChiquita } from './_components/chat-list-chiquita';

interface ResizableChatsLayoutProps {
    sidebar: React.ReactNode;  // Chat List
    children: React.ReactNode; // Main Content Area
}

export default function ResizableChatsLayout({ sidebar, children }: ResizableChatsLayoutProps) {
    const [sidebarWidth, setSidebarWidth] = useState(350); // Initial width (approx w-1/4)
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const startResizing = (mouseDownEvent: React.MouseEvent) => {
        setIsResizing(true);
    };

    const stopResizing = () => {
        setIsResizing(false);
    };

    const resize = (mouseMoveEvent: MouseEvent) => {
        if (isResizing) {
            // Calculate new width relative to mouse X position
            // Since sidebar is on the LEFT, width = mouseX
            const newWidth = mouseMoveEvent.clientX - 64; // Subtract admin sidebar width (w-16 = 64px) approx
            // Note: The admin sidebar is collapsible, so its width varies (80px or 256px). 
            // A safer bet is to calculate based on movement or use getBoundingClientRect if needed.

            // Simpler: Just rely on movement. 
            // Or better: effectively the mouse clientX IS the position from left edge of screen.
            // But we have the Admin Sidebar to the left.

            // Let's rely on the ref to get the offset if possible, or just estimate.
            // Actually, `mouseMoveEvent.clientX` includes the admin sidebar.
            // So `sidebarWidth` should be `mouseMoveEvent.clientX - adminSidebarWidth`.
            // However, we don't easily know the admin sidebar width here without passing it down or checking DOM.

            // ALTERNATIVE: Use `movementX` to adjust current width.
            // setSidebarWidth(prev => prev + mouseMoveEvent.movementX);

            // Let's try movementX approach as it's relative.
            setSidebarWidth(prev => {
                const newW = prev + mouseMoveEvent.movementX;
                if (newW < 200) return 200; // Min width
                if (newW > 600) return 600; // Max width
                return newW;
            });
        }
    };

    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', resize);
            window.addEventListener('mouseup', stopResizing);
        } else {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        }

        return () => {
            window.removeEventListener('mousemove', resize);
            window.removeEventListener('mouseup', stopResizing);
        };
    }, [isResizing]);

    return (
        <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
            {/* Sidebar (Resizable) */}
            <div
                ref={sidebarRef}
                className="flex-shrink-0 flex flex-col border-r border-gray-200 bg-white"
                style={{ width: sidebarWidth }}
            >
                {/* {sidebar} - Replaced with internal component */}
                <div className="h-full overflow-hidden">
                    <ChatListChiquita
                        onSelectChat={(chat) => {
                            // We can use Next.js router to navigate
                            // Wait, we need to access router.
                            // But this is a client component, so it's fine.
                            // But we need 'useRouter' hook.
                            window.location.href = `/admin/whatsapp/chats/${chat.remoteJid}`;
                        }}
                    />
                </div>
            </div>

            {/* Drag Handle */}
            <div
                className={`w-1 cursor-col-resize hover:bg-purple-400 z-10 flex flex-col justify-center items-center transition-colors
                    ${isResizing ? 'bg-purple-600' : 'bg-transparent hover:bg-gray-100'}
                    -ml-0.5 z-20
                `}
                onMouseDown={startResizing}
            >
                {/* Visual Grip Handle (Optional) */}
            </div>

            {/* Main Content Area (Flexible) */}
            <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden min-w-0">
                {children}
            </div>

            {/* Overlay to prevent iframe/selection issues during drag */}
            {isResizing && (
                <div className="fixed inset-0 z-50 cursor-col-resize bg-transparent" />
            )}
        </div>
    );
}
