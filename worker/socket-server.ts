
import { Server } from 'socket.io';
import { createServer } from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const httpServer = createServer();
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all for now, restrict in production
        methods: ["GET", "POST"]
    }
});

const PORT = 4000;

console.log(`[Socket Server] Starting on port ${PORT}...`);

io.of('/chat').on('connection', (socket) => {
    console.log(`[Socket Server] Client connected: ${socket.id}`);

    socket.on('joinRoom', (room) => {
        console.log(`[Socket Server] Client ${socket.id} joined room: ${room}`);
        socket.join(room);
    });

    socket.on('leaveRoom', (room) => {
        console.log(`[Socket Server] Client ${socket.id} left room: ${room}`);
        socket.leave(room);
    });

    socket.on('sendMessage', async (data) => {
        const { remoteJid, message } = data;
        console.log(`[Socket Server] Received message for ${remoteJid}: ${message}`);

        // Broadcast to room (optimistic update for sender)
        // In a real app, we wait for Evolution to confirm, but for UI responsiveness we can emit back 
        // OR we just rely on the worker to pick it up via webhook/polling and emit 'new_message'

        // For now, let's just log it. The actual sending SHOULD happen via API call to Evolution
        // But if this socket is meant to TRIGGER the send, we need to call Evolution here or via queue.
        // Chiquita's frontend calls EvolutionService.sendMessage (HTTP) AND emits 'sendMessage' (Socket)?
        // Let's check Chiquita's implementation again.
        // Chiquita ChatWindow: 
        // socketRef.current?.emit('sendMessage', { remoteJid, message });
        // AND handleSend: calls socket only? 
        // Wait, Chiquita's ChatWindow.tsx: 
        /*
            const handleSend = async () => {
                ...
                socketRef.current?.emit('sendMessage', { ... }); 
            }
        */
        // It seems Chiquita backend handles the actual sending when it receives 'sendMessage' event.

        // SO, we need to IMPLEMENT SENDING logic here or put it in the queue.
        // Let's create a pending WhatsAppOutgoing record here, which the worker will pick up!

        try {
            await prisma.whatsAppOutgoing.create({
                data: {
                    jid: remoteJid,
                    content: message,
                    status: 'PENDING'
                }
            });
            console.log(`[Socket Server] Queued queued message for ${remoteJid}`);
        } catch (e) {
            console.error(`[Socket Server] Failed to queue message:`, e);
        }
    });

    socket.on('toggleBot', async (data) => {
        const { remoteJid, enabled } = data;
        console.log(`[Socket Server] Toggle bot for ${remoteJid}: ${enabled}`);

        // Update DB
        try {
            // Check if conversation exists, update it
            // We need to find the conversation first.
            // But wait, where is 'isBotEnabled' stored?
            // Chiquita has `ChatSession` model with `isBotEnabled`.
            // isp-app has `WhatsAppConversation`. 
            // We need to add `handedToHuman` (inverse of bot enabled) to `WhatsAppConversation`.

            // Let's find the active conversation for this user
            // Or just update the latest one.

            // Actually, we should check implementation plan. 
            // "Update query to include conversations (latest) to determine handedToHuman status."

            // So we need to find the Chat/Conversation.
            const chat = await prisma.whatsAppChat.findUnique({
                where: { jid: remoteJid },
                include: { conversations: { orderBy: { createdAt: 'desc' }, take: 1 } }
            });

            if (chat && chat.conversations.length > 0) {
                const conv = chat.conversations[0];
                await prisma.whatsAppConversation.update({
                    where: { id: conv.id },
                    data: { handedToHuman: !enabled } // enabled=true means bot is active -> handedToHuman=false
                });

                // Broadcast update
                io.of('/chat').to(remoteJid).emit('bot_status', { enabled });

            } else {
                console.warn(`[Socket Server] No conversation found for ${remoteJid}`);
            }
        } catch (e) {
            console.error(`[Socket Server] Failed to toggle bot:`, e);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket Server] Client disconnected: ${socket.id}`);
    });
});

// HTTP Endpoint for internal broadcasting (from worker)
httpServer.on('request', async (req, res) => {
    if (req.method === 'POST' && req.url === '/broadcast') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', () => {
            try {
                const data = JSON.parse(body);
                const { event, room, payload } = data;

                if (event && room && payload) {
                    io.of('/chat').to(room).emit(event, payload);
                    console.log(`[Socket Server] Broadcasted ${event} to ${room}`);
                    res.writeHead(200);
                    res.end('OK');
                } else {
                    res.writeHead(400);
                    res.end('Invalid Payload');
                }
            } catch (e) {
                res.writeHead(500);
                res.end('Error');
            }
        });
    }
});

httpServer.listen(PORT, () => {
    console.log(`[Socket Server] Listening on *:${PORT}`);
});
