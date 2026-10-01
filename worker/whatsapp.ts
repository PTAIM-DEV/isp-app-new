import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { setupQueueConsumer } from './queue-consumer.js';
import { evolutionApi } from '../src/lib/evolution-api.js';

const prisma = new PrismaClient();

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Start Redis Queue Consumer
setupQueueConsumer();

console.log('[Worker] Started Evolution API Worker');

async function processOutgoingQueue() {
    try {
        // Log periodically to show worker is alive
        if (Math.random() < 0.05) { // Log ~every 20 polls (40s)
            console.log('[Worker] Polling outgoing queue...');
        }

        const pendingMessages = await prisma.whatsAppOutgoing.findMany({
            where: {
                status: 'PENDING',
                OR: [
                    { scheduledAt: null },
                    { scheduledAt: { lte: new Date() } }
                ]
            },
            take: 1, // Process 1 at a time
            orderBy: { createdAt: 'asc' }
        });

        if (pendingMessages.length > 0) {
            console.log(`[Worker] Found ${pendingMessages.length} pending messages ready to process`);
        }

        if (pendingMessages.length === 0) {
            return;
        }

        const msg = pendingMessages[0];
        console.log(`[Worker] Processing message outgoing id: ${msg.id} to ${msg.jid}`);

        try {
            // Parse Typing Pattern: [TYPING:seconds]
            const typingMatch = msg.content.match(/\[TYPING:(\d+)\]/);
            let finalContent = msg.content;

            if (typingMatch) {
                const seconds = parseInt(typingMatch[1]);
                console.log(`[Worker] Simulate typing for ${seconds}s to ${msg.jid}`);

                // Remove the tag from content to be sent
                finalContent = msg.content.replace(/\[TYPING:\d+\]/, '').trim();

                // Send typing presence
                await evolutionApi.sendPresence(msg.jid, 'composing');

                // Wait for the specified seconds
                await new Promise(resolve => setTimeout(resolve, seconds * 1000));
            }

            // Parse Media Pattern: [MEDIA:type:path:filename]
            const mediaMatch = finalContent.match(/\[MEDIA:(\w+):(.+?):(.+?)\]/);

            if (mediaMatch) {
                const [, mediaType, mediaPath, fileName] = mediaMatch;
                const messageText = finalContent.replace(/\[MEDIA:.*?\]/, '').trim();

                if (fs.existsSync(mediaPath)) {
                    // Read file
                    const fileBuffer = fs.readFileSync(mediaPath);
                    const base64 = fileBuffer.toString('base64');
                    // Determine mime type roughly
                    const mimeType = mediaType === 'video' ? 'video/mp4' : (mediaType === 'image' ? 'image/jpeg' : 'application/pdf');
                    const dataUrl = `data:${mimeType};base64,${base64}`;

                    await evolutionApi.sendMediaMessage(
                        msg.jid,
                        mediaType as 'image' | 'video' | 'document',
                        dataUrl,
                        messageText || undefined,
                        fileName
                    );

                    // Cleanup
                    try {
                        fs.unlinkSync(mediaPath);
                        console.log(`[Worker] Cleaned up temp file: ${mediaPath}`);
                    } catch (e) {
                        console.error(`[Worker] Failed to cleanup file: ${mediaPath}`, e);
                    }
                } else {
                    console.warn(`[Worker] Media file not found: ${mediaPath}`);
                    throw new Error(`Media file not found: ${mediaPath}`);
                }

            } else {
                // Text Message
                if (finalContent || !typingMatch) { // Only send if there's content, or if it wasn't JUST a typing indicator (which shouldn't happen based on regex but good safety)
                    await evolutionApi.sendTextMessage(msg.jid, finalContent);
                }
            }

            // Success
            await prisma.whatsAppOutgoing.update({
                where: { id: msg.id },
                data: { status: 'SENT' }
            });
            console.log(`[Worker] Sent message ${msg.id}`);

            // BROADCAST SENT STATUS
            try {
                // We want to show the message as "sent" or just append it if the UI didn't have it (e.g. sent via other means)
                // If it was sent via the Socket UI, it might already be there optimistically. 
                // But let's confirm it.
                await fetch('http://localhost:4000/broadcast', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        event: 'message_sent', // Or just 'new_message' if we want to ensure it appears
                        room: msg.jid,
                        payload: {
                            id: msg.id,
                            remoteJid: msg.jid,
                            sender: 'bot', // or 'admin', since this worker handles both. 
                            // Ideally we check metadata or source if available. 
                            // For now 'bot' is safe as it's automated sending usually, 
                            // but if triggered by admin UI `whatsapp.ts` might not be the one sending it directly 
                            // (if UI calls API directly). 
                            // Wait, recent plan change: Socket Server puts in DB, Worker picks up.
                            // So this IS the path for Admin messages too.
                            text: finalContent,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            status: 'sent'
                        }
                    })
                });
            } catch (e: any) {
                console.error('[Worker] Failed to broadcast sent status:', e.message);
            }

            // Update welcome flag if needed
            if (msg.content.includes('Selamat datang') || msg.content.includes('Selamat datang')) {
                const phoneNumber = msg.jid.split('@')[0];
                const cleanPhone = phoneNumber.replace(/@s\.whatsapp\.net$/, '');

                const user = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { phone: cleanPhone },
                            { phone: cleanPhone.replace(/^62/, '0') },
                            { phone: cleanPhone.replace(/^62/, '') },
                        ],
                    },
                });

                if (user && !user.welcomeWhatsappSent) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            welcomeWhatsappSent: true,
                            welcomeWhatsappSentAt: new Date(),
                        },
                    });
                }
            }

        } catch (error: any) {
            console.error(`[Worker] Failed to send message ${msg.id}:`, error.message);

            // Per request: NO RETRY. Fail immediately.
            await prisma.whatsAppOutgoing.update({
                where: { id: msg.id },
                data: {
                    status: 'FAILED',
                    retryCount: (msg.retryCount || 0) + 1
                }
            });
            console.log(`[Worker] Message ${msg.id} marked as FAILED. No retry.`);
        }


        // Get random delay from settings or default
        let minDelay = 60000;
        let maxDelay = 180000;

        try {
            const minSetting = await prisma.systemSetting.findUnique({ where: { key: 'WA_DELAY_MIN' } });
            const maxSetting = await prisma.systemSetting.findUnique({ where: { key: 'WA_DELAY_MAX' } });

            if (minSetting?.value) minDelay = parseInt(minSetting.value) * 1000;
            if (maxSetting?.value) maxDelay = parseInt(maxSetting.value) * 1000;
        } catch (e) {
            console.error('[Worker] Failed to fetch delay settings, using defaults', e);
        }

        const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1) + minDelay);

        console.log(`[Worker] Cooldown: Waiting for ${Math.round(delay / 1000)}s before handling next message...`);
        await new Promise(resolve => setTimeout(resolve, delay));

    } catch (error) {
        console.error('[Worker] Error in polling loop:', error);
    }
}

// Start Worker Loop
async function startWorker() {
    console.log('[Worker] Starting polling loop...');
    while (true) {
        try {
            await processOutgoingQueue();
        } catch (error) {
            console.error('[Worker] Critical error in worker loop:', error);
        }
        // Wait before next poll to prevent tight loops and overlapping executions
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
}

// Start the loop
startWorker();
