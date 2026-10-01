"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const baileys_1 = require("@whiskeysockets/baileys");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function connectToWhatsApp() {
    const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)('baileys_auth_info');
    const sock = (0, baileys_1.makeWASocket)({
        auth: state,
        printQRInTerminal: true,
        browser: ['Ubuntu', 'Firefox', '120.0']
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        var _a, _b;
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            console.log('QR Code received');
            await prisma.systemSetting.upsert({
                where: { key: 'whatsapp_qr' },
                update: { value: qr },
                create: { key: 'whatsapp_qr', value: qr }
            });
            await prisma.systemSetting.upsert({
                where: { key: 'whatsapp_status' },
                update: { value: 'QR_READY' },
                create: { key: 'whatsapp_status', value: 'QR_READY' }
            });
        }
        if (connection === 'close') {
            const shouldReconnect = ((_b = (_a = lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.statusCode) !== baileys_1.DisconnectReason.loggedOut;
            console.log('connection closed due to ', lastDisconnect === null || lastDisconnect === void 0 ? void 0 : lastDisconnect.error, ', reconnecting ', shouldReconnect);
            await prisma.systemSetting.upsert({
                where: { key: 'whatsapp_status' },
                update: { value: 'DISCONNECTED' },
                create: { key: 'whatsapp_status', value: 'DISCONNECTED' }
            });
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        }
        else if (connection === 'open') {
            console.log('opened connection');
            await prisma.systemSetting.upsert({
                where: { key: 'whatsapp_status' },
                update: { value: 'CONNECTED' },
                create: { key: 'whatsapp_status', value: 'CONNECTED' }
            });
        }
    });
    // Outgoing Message Poller
    setInterval(async () => {
        try {
            const pendingMessages = await prisma.whatsAppOutgoing.findMany({
                where: { status: 'PENDING' },
                take: 10
            });
            for (const msg of pendingMessages) {
                try {
                    await sock.sendMessage(msg.jid, { text: msg.content });
                    await prisma.whatsAppOutgoing.update({
                        where: { id: msg.id },
                        data: { status: 'SENT' }
                    });
                    console.log(`Sent message to ${msg.jid}: ${msg.content}`);
                }
                catch (error) {
                    console.error(`Failed to send message to ${msg.jid}:`, error);
                    await prisma.whatsAppOutgoing.update({
                        where: { id: msg.id },
                        data: { status: 'FAILED' }
                    });
                }
            }
        }
        catch (e) {
            console.error('Error in outgoing poller:', e);
        }
    }, 1000);
    sock.ev.on('messages.upsert', async (m) => {
        var _a, _b, _c, _d, _e;
        const msg = m.messages[0];
        if (!msg.message)
            return;
        const jid = msg.key.remoteJid;
        if (jid === 'status@broadcast' || jid.endsWith('@newsletter'))
            return;
        const isMe = msg.key.fromMe;
        const isGroup = jid.endsWith('@g.us');
        const phoneNumber = jid.split('@')[0];
        const pushName = msg.pushName || phoneNumber;
        const messageContent = ((_b = (_a = msg.message) === null || _a === void 0 ? void 0 : _a.viewOnceMessage) === null || _b === void 0 ? void 0 : _b.message) ||
            ((_d = (_c = msg.message) === null || _c === void 0 ? void 0 : _c.viewOnceMessageV2) === null || _d === void 0 ? void 0 : _d.message) ||
            msg.message;
        let content = '';
        let msgType = 'text';
        let mediaUrl = null;
        try {
            if (messageContent === null || messageContent === void 0 ? void 0 : messageContent.conversation) {
                content = messageContent.conversation;
            }
            else if ((_e = messageContent === null || messageContent === void 0 ? void 0 : messageContent.extendedTextMessage) === null || _e === void 0 ? void 0 : _e.text) {
                content = messageContent.extendedTextMessage.text;
            }
            else if (messageContent === null || messageContent === void 0 ? void 0 : messageContent.imageMessage) {
                msgType = 'image';
                content = messageContent.imageMessage.caption ? `[Image] ${messageContent.imageMessage.caption}` : '[Image]';
                const buffer = await (0, baileys_1.downloadMediaMessage)(msg, 'buffer', {});
                const fileName = `image-${Date.now()}.jpg`;
                const filePath = path.join(process.cwd(), 'public', 'uploads', 'whatsapp', fileName);
                fs.writeFileSync(filePath, buffer);
                mediaUrl = `/uploads/whatsapp/${fileName}`;
            }
            else if (messageContent === null || messageContent === void 0 ? void 0 : messageContent.videoMessage) {
                msgType = 'video';
                content = messageContent.videoMessage.caption ? `[Video] ${messageContent.videoMessage.caption}` : '[Video]';
                const buffer = await (0, baileys_1.downloadMediaMessage)(msg, 'buffer', {});
                const fileName = `video-${Date.now()}.mp4`;
                const filePath = path.join(process.cwd(), 'public', 'uploads', 'whatsapp', fileName);
                fs.writeFileSync(filePath, buffer);
                mediaUrl = `/uploads/whatsapp/${fileName}`;
            }
            else if (messageContent === null || messageContent === void 0 ? void 0 : messageContent.stickerMessage) {
                msgType = 'sticker';
                content = '[Sticker]';
                const buffer = await (0, baileys_1.downloadMediaMessage)(msg, 'buffer', {});
                const fileName = `sticker-${Date.now()}.webp`;
                const filePath = path.join(process.cwd(), 'public', 'uploads', 'whatsapp', fileName);
                fs.writeFileSync(filePath, buffer);
                mediaUrl = `/uploads/whatsapp/${fileName}`;
            }
            else if (messageContent === null || messageContent === void 0 ? void 0 : messageContent.audioMessage) {
                msgType = 'audio';
                content = '[Audio]';
                const buffer = await (0, baileys_1.downloadMediaMessage)(msg, 'buffer', {});
                const fileName = `audio-${Date.now()}.mp3`;
                const filePath = path.join(process.cwd(), 'public', 'uploads', 'whatsapp', fileName);
                fs.writeFileSync(filePath, buffer);
                mediaUrl = `/uploads/whatsapp/${fileName}`;
            }
            else if (messageContent === null || messageContent === void 0 ? void 0 : messageContent.documentMessage) {
                msgType = 'document';
                content = `[Document] ${messageContent.documentMessage.fileName || ''}`;
                const buffer = await (0, baileys_1.downloadMediaMessage)(msg, 'buffer', {});
                const fileName = `doc-${Date.now()}-${messageContent.documentMessage.fileName || 'file'}`;
                const filePath = path.join(process.cwd(), 'public', 'uploads', 'whatsapp', fileName);
                fs.writeFileSync(filePath, buffer);
                mediaUrl = `/uploads/whatsapp/${fileName}`;
            }
            else if (messageContent === null || messageContent === void 0 ? void 0 : messageContent.reactionMessage) {
                return;
            }
            else if (messageContent === null || messageContent === void 0 ? void 0 : messageContent.protocolMessage) {
                return;
            }
            else {
                console.log('Unknown message type:', JSON.stringify(msg.message, null, 2));
                content = '[Media/Other]';
            }
        }
        catch (err) {
            console.error('Error downloading media:', err);
            content = content + ' (Download Failed)';
        }
        // Upsert Chat
        let chatName = pushName;
        if (isGroup) {
            try {
                const groupMetadata = await sock.groupMetadata(jid);
                chatName = groupMetadata.subject;
            }
            catch (e) {
                chatName = 'Group Chat';
            }
        }
        await prisma.whatsAppChat.upsert({
            where: { jid },
            update: {
                lastMsg: new Date(Number(msg.messageTimestamp) * 1000),
                name: isGroup ? chatName : undefined
            },
            create: {
                jid,
                name: chatName,
                lastMsg: new Date(Number(msg.messageTimestamp) * 1000)
            }
        });
        // Create Message
        await prisma.whatsAppMessage.create({
            data: {
                chat: { connect: { jid } },
                sender: isMe ? 'ME' : pushName,
                content,
                mediaUrl,
                type: msgType,
                createdAt: new Date(Number(msg.messageTimestamp) * 1000)
            }
        });
        console.log(`Saved message from ${pushName}: ${content}`);
    });
}
connectToWhatsApp();
