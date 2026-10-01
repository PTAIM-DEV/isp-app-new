'use client';

import React, { useState, useRef, useEffect } from 'react';

interface ResizableChatLayoutProps {
    children: React.ReactNode; // Chat Window
    sidebar: React.ReactNode;  // Customer Context Panel
}

export default function ResizableChatLayout({ children, sidebar }: ResizableChatLayoutProps) {
    const [sidebarWidth, setSidebarWidth] = useState(350); // Initial width
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
            // Calculate new width relative to the right edge of the screen
            // Since the sidebar is on the right, width = window.innerWidth - mouseX
            // However, we are in a flex container, so it might be easier to calculate based on movement

            // Simpler approach: new width = current window width - mouse X position
            // But we need to account for the layout context. 
            // Let's assume the resize handle is on the left of the sidebar.
            // Width is distance from right edge of container to mouse position? 
            // Or simpler: The sidebar is flex-none, just set its width style.

            // Let's use the mouse position relative to the viewport for simplicity first
            // If the sidebar is on the right:
            const newWidth = window.innerWidth - mouseMoveEvent.clientX;

            // Set limits (min 250px, max 600px)
            if (newWidth > 250 && newWidth < 800) {
                setSidebarWidth(newWidth);
            }
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
        <div className="flex h-full w-full overflow-hidden">
            {/* Main Chat Area (Flexible) */}
            <div className="flex-1 min-w-0 relative h-full">
                {children}
            </div>

            {/* Drag Handle */}
            <div
                className={`w-1 cursor-col-resize hover:bg-blue-400 z-10 flex flex-col justify-center items-center transition-colors
                    ${isResizing ? 'bg-blue-600' : 'bg-gray-200'}
                `}
                onMouseDown={startResizing}
            >
                {/* Visual Grip Handle (Optional) */}
                <div className="h-8 w-1 bg-gray-400 rounded-full" />
            </div>

            {/* Sidebar (Resizable) */}
            <div
                ref={sidebarRef}
                className="flex-shrink-0 h-full bg-white border-l border-gray-200 overflow-hidden"
                style={{ width: sidebarWidth }}
            >
                {sidebar}
            </div>

            {/* Overlay to prevent iframe capturing mouse events during drag if any */}
            {isResizing && (
                <div className="fixed inset-0 z-50 cursor-col-resize bg-transparent" />
            )}
        </div>
    );
}
