import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { aiService } from '@/lib/ai-service';
import { evolutionApi } from '@/lib/evolution-api';

// Ensure upload directory exists
const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const type = body.type || body.event;
        const { data, instance } = body;

        // Verify instance name if necessary
        const expectedInstance = process.env.EVOLUTION_INSTANCE_NAME || 'isp-app';
        // Allow if instance matches or if we just accept all for now to avoid confusion
        if (instance !== expectedInstance && instance !== 'isp-app-new') {
            return NextResponse.json({ status: 'ignored', reason: 'wrong_instance' });
        }

        console.log(`[Evolution Webhook] Received event: ${type}`);

        switch (type) {
            case 'MESSAGES_UPSERT':
            case 'messages.upsert':
                await handleMessagesUpsert(data);
                break;
            case 'CONNECTION_UPDATE':
            case 'connection.update':
                await handleConnectionUpdate(data);
                break;
            case 'QRCODE_UPDATED':
            case 'qrcode.updated':
                await handleQrCodeUpdate(data);
                break;
            default:
            // console.log('Unhandled event type:', type);
        }

        return NextResponse.json({ status: 'ok' });
    } catch (error: any) {
        console.error('[Evolution Webhook] Error:', error);
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}

async function handleQrCodeUpdate(data: any) {
    let { qrcode } = data;

    // Safety handling for object QR code
    if (typeof qrcode === 'object' && qrcode !== null) {
        qrcode = qrcode.base64 || qrcode.code || '';
    }

    if (qrcode && typeof qrcode === 'string') {
        const qrValue = qrcode; // Ensure it's treated as string
        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_qr' },
            update: { value: qrValue },
            create: { key: 'whatsapp_qr', value: qrValue }
        });

        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_status' },
            update: { value: 'QR_READY' },
            create: { key: 'whatsapp_status', value: 'QR_READY' }
        });
    }
}

async function handleConnectionUpdate(data: any) {
    const { status, state } = data;
    const connectionStatus = state || status;

    let dbStatus = 'DISCONNECTED';
    if (connectionStatus === 'open') {
        dbStatus = 'CONNECTED';
        // Clear QR
        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_qr' },
            update: { value: '' },
            create: { key: 'whatsapp_qr', value: '' }
        });
    } else if (connectionStatus === 'connecting') {
        dbStatus = 'CONNECTING';
    }

    await prisma.systemSetting.upsert({
        where: { key: 'whatsapp_status' },
        update: { value: dbStatus },
        create: { key: 'whatsapp_status', value: dbStatus }
    });
}

async function handleMessagesUpsert(data: any) {
    // data usually contains { messages: [...] } or is the message object itself depending on webhook config
    // Evolution API Global Webhook usually sends the message object directly or inside data

    // Assuming data is the payload from Evolution
    const message = data.message || data;
    const key = data.key;

    if (!key) return; // Invalid message

    const isMe = key.fromMe;
    const jid = key.remoteJid;
    const isGroup = jid.endsWith('@g.us');

    if (jid === 'status@broadcast') return;

    // Determine content and type
    let content = '';
    let msgType = 'text';
    let mediaUrl: string | null = null;

    const messageContent = message; // In Evolution, message object usually has type keys

    // Evolution API simplifies the structure usually, but let's handle standard Baileys-like structure 
    // if Evolution passes it through (it often does for MESSAGES_UPSERT)

    if (messageContent.conversation) {
        content = messageContent.conversation;
    } else if (messageContent.extendedTextMessage?.text) {
        content = messageContent.extendedTextMessage.text;
    } else if (messageContent.imageMessage) {
        msgType = 'image';
        content = messageContent.imageMessage.caption ? messageContent.imageMessage.caption : ''; // Just caption, image handling logic in AI service will detect type
    } else if (messageContent.documentMessage) {
        const mimetype = messageContent.documentMessage.mimetype || '';
        if (mimetype.includes('image') || mimetype.includes('pdf')) {
            msgType = 'image'; // Treat as image/proof for AI purposes
            content = messageContent.documentMessage.caption ? messageContent.documentMessage.caption : '[Document Sent]';
        } else {
            content = '[Document Sent]';
        }
    } else {
        // Fallback
        content = '[Unsupported Message Type]';
    }

    // Duplicate check
    const existingMessage = await prisma.whatsAppMessage.findFirst({
        where: {
            chat: { jid },
            content,
            createdAt: { gte: new Date(Date.now() - 10000) }, // Check last 10s
            sender: isMe ? 'ME' : 'OTHER'
        }
    });

    if (existingMessage) return;

    // Upsert Chat
    const pushName = data.pushName;
    const phoneNumber = jid.split('@')[0];
    let chatName = pushName || phoneNumber;

    if (isGroup) {
        // Evolution might send group subject in `data` or we need to fetch it
        // data.participant might be present
        chatName = 'Group Chat'; // Fallback
    }

    const chat = await prisma.whatsAppChat.upsert({
        where: { jid },
        update: {
            lastMsg: new Date(),
            unread: isMe ? 0 : { increment: 1 }
        },
        create: {
            jid,
            name: chatName,
            lastMsg: new Date(),
            unread: isMe ? 0 : 1
        }
    });

    // Create Message
    await prisma.whatsAppMessage.create({
        data: {
            chatId: chat.id,
            content,
            sender: isMe ? 'ME' : 'OTHER',
            type: msgType,
            mediaUrl,
            id: key.id // Store WhatsApp Message ID
        }
    });

    // Handle User Welcome Logic (if applicable)
    if (isMe && (content.includes('Selamat datang') || content.includes('Selamat datang'))) {
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { phone: phoneNumber },
                    { phone: phoneNumber.replace(/^62/, '0') },
                    { phone: phoneNumber.replace(/^62/, '') },
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

    // AI AUTO-REPLY LOGIC
    // Only reply if it's NOT from me, and it's a text message (or has content)
    // AI AUTO-REPLY LOGIC
    // ... (existing AI logic)

    // SOCKET BROADCAST (Incoming Message)
    try {
        const payload = {
            id: key.id,
            remoteJid: jid,
            sender: 'customer', // Incoming is always customer/other in this webhook context (mostly)
            text: content,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            status: 'human_needed', // Default for now
            unread: isMe ? 0 : 1
        };

        // Fire and forget broadcast
        fetch('http://localhost:4000/broadcast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event: 'new_message',
                room: jid,
                payload: payload
            })
        }).catch(e => console.error('[Webhook] Failed to broadcast to socket:', e.message));

    } catch (e) {
        console.error('[Webhook] Broadcast error:', e);
    }

    if (!isMe && content && !isGroup) {

        // Run AI in background (fire and forget) to not block webhook response
        (async () => {
            try {
                // Check if AI Reply is enabled
                const aiReplySetting = await prisma.systemSetting.findUnique({ where: { key: 'WA_AI_REPLY' } });
                const aiEnabled = aiReplySetting ? aiReplySetting.value !== 'false' : true; // Default to true

                if (!aiEnabled) {
                    console.log('[Webhook] AI Reply is disabled. Skipping AI processing.');
                    return;
                }

                // Determine if we should reply.
                // Currently replying to ALL personal messages.
                // In future, might want to check for specific prefixes or "bot mode".

                let response: string | null = null;

                if (msgType === 'image') {
                    // Process Image Message (Payment Proof detection)
                    response = await aiService.processImageMessage(jid, content);
                } else {
                    // Process Text Message
                    response = await aiService.generateResponse(jid, content);
                }

                if (response) {
                    // Send response via Evolution API
                    await evolutionApi.sendTextMessage(jid, response);

                    // Save the AI's response to database so it appears in history
                    // We need to find the chat again or use chatId we have
                    // But we can just create message directly
                    await prisma.whatsAppMessage.create({
                        data: {
                            chatId: chat.id,
                            content: response,
                            sender: 'ME',
                            type: 'text',
                        }
                    });
                }
            } catch (error) {
                console.error('[Webhook] AI processing failed:', error);
            }
        })();
    }
}
