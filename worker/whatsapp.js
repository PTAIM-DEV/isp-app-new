var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
import * as fs from 'fs';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';
import { setupQueueConsumer } from './queue-consumer.js';
import { evolutionApi } from '../src/lib/evolution-api.js';
var prisma = new PrismaClient();
// Ensure upload directory exists
var uploadDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
// Start Redis Queue Consumer
setupQueueConsumer();
console.log('[Worker] Started Evolution API Worker');
function processOutgoingQueue() {
    return __awaiter(this, void 0, void 0, function () {
        var pendingMessages, msg, typingMatch, finalContent, seconds_1, mediaMatch, mediaType, mediaPath, fileName, messageText, fileBuffer, base64, mimeType, dataUrl, phoneNumber, cleanPhone, user, error_1, retryCount, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 22, , 23]);
                    // Log periodically to show worker is alive
                    if (Math.random() < 0.05) { // Log ~every 20 polls (40s)
                        console.log('[Worker] Polling outgoing queue...');
                    }
                    return [4 /*yield*/, prisma.whatsAppOutgoing.findMany({
                            where: {
                                status: 'PENDING',
                                OR: [
                                    { scheduledAt: null },
                                    { scheduledAt: { lte: new Date() } }
                                ]
                            },
                            take: 1, // Process 1 at a time
                            orderBy: { createdAt: 'asc' }
                        })];
                case 1:
                    pendingMessages = _a.sent();
                    if (pendingMessages.length > 0) {
                        console.log("[Worker] Found ".concat(pendingMessages.length, " pending messages ready to process"));
                    }
                    if (pendingMessages.length === 0) {
                        return [2 /*return*/];
                    }
                    msg = pendingMessages[0];
                    console.log("[Worker] Processing message outgoing id: ".concat(msg.id, " to ").concat(msg.jid));
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 16, , 21]);
                    typingMatch = msg.content.match(/\[TYPING:(\d+)\]/);
                    finalContent = msg.content;
                    if (!typingMatch) return [3 /*break*/, 5];
                    seconds_1 = parseInt(typingMatch[1]);
                    console.log("[Worker] Simulate typing for ".concat(seconds_1, "s to ").concat(msg.jid));
                    // Remove the tag from content to be sent
                    finalContent = msg.content.replace(/\[TYPING:\d+\]/, '').trim();
                    // Send typing presence
                    return [4 /*yield*/, evolutionApi.sendPresence(msg.jid, 'composing')];
                case 3:
                    // Send typing presence
                    _a.sent();
                    // Wait for the specified seconds
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, seconds_1 * 1000); })];
                case 4:
                    // Wait for the specified seconds
                    _a.sent();
                    _a.label = 5;
                case 5:
                    mediaMatch = finalContent.match(/\[MEDIA:(\w+):(.+?):(.+?)\]/);
                    if (!mediaMatch) return [3 /*break*/, 9];
                    mediaType = mediaMatch[1], mediaPath = mediaMatch[2], fileName = mediaMatch[3];
                    messageText = finalContent.replace(/\[MEDIA:.*?\]/, '').trim();
                    if (!fs.existsSync(mediaPath)) return [3 /*break*/, 7];
                    fileBuffer = fs.readFileSync(mediaPath);
                    base64 = fileBuffer.toString('base64');
                    mimeType = mediaType === 'video' ? 'video/mp4' : (mediaType === 'image' ? 'image/jpeg' : 'application/pdf');
                    dataUrl = "data:".concat(mimeType, ";base64,").concat(base64);
                    return [4 /*yield*/, evolutionApi.sendMediaMessage(msg.jid, mediaType, dataUrl, messageText || undefined, fileName)];
                case 6:
                    _a.sent();
                    // Cleanup
                    try {
                        fs.unlinkSync(mediaPath);
                        console.log("[Worker] Cleaned up temp file: ".concat(mediaPath));
                    }
                    catch (e) {
                        console.error("[Worker] Failed to cleanup file: ".concat(mediaPath), e);
                    }
                    return [3 /*break*/, 8];
                case 7:
                    console.warn("[Worker] Media file not found: ".concat(mediaPath));
                    throw new Error("Media file not found: ".concat(mediaPath));
                case 8: return [3 /*break*/, 11];
                case 9:
                    if (!(finalContent || !typingMatch)) return [3 /*break*/, 11];
                    return [4 /*yield*/, evolutionApi.sendTextMessage(msg.jid, finalContent)];
                case 10:
                    _a.sent();
                    _a.label = 11;
                case 11: 
                // Success
                return [4 /*yield*/, prisma.whatsAppOutgoing.update({
                        where: { id: msg.id },
                        data: { status: 'SENT' }
                    })];
                case 12:
                    // Success
                    _a.sent();
                    console.log("[Worker] Sent message ".concat(msg.id));
                    if (!(msg.content.includes('Selamat datang') || msg.content.includes('Selamat datang'))) return [3 /*break*/, 15];
                    phoneNumber = msg.jid.split('@')[0];
                    cleanPhone = phoneNumber.replace(/@s\.whatsapp\.net$/, '');
                    return [4 /*yield*/, prisma.user.findFirst({
                            where: {
                                OR: [
                                    { phone: cleanPhone },
                                    { phone: cleanPhone.replace(/^62/, '0') },
                                    { phone: cleanPhone.replace(/^62/, '') },
                                ],
                            },
                        })];
                case 13:
                    user = _a.sent();
                    if (!(user && !user.welcomeWhatsappSent)) return [3 /*break*/, 15];
                    return [4 /*yield*/, prisma.user.update({
                            where: { id: user.id },
                            data: {
                                welcomeWhatsappSent: true,
                                welcomeWhatsappSentAt: new Date(),
                            },
                        })];
                case 14:
                    _a.sent();
                    _a.label = 15;
                case 15: return [3 /*break*/, 21];
                case 16:
                    error_1 = _a.sent();
                    console.error("[Worker] Failed to send message ".concat(msg.id, ":"), error_1.message);
                    retryCount = (msg.retryCount || 0) + 1;
                    if (!(retryCount < 10)) return [3 /*break*/, 18];
                    return [4 /*yield*/, prisma.whatsAppOutgoing.update({
                            where: { id: msg.id },
                            data: { retryCount: retryCount }
                        })];
                case 17:
                    _a.sent();
                    return [3 /*break*/, 20];
                case 18: return [4 /*yield*/, prisma.whatsAppOutgoing.update({
                        where: { id: msg.id },
                        data: { status: 'FAILED', retryCount: retryCount }
                    })];
                case 19:
                    _a.sent();
                    _a.label = 20;
                case 20: return [3 /*break*/, 21];
                case 21: return [3 /*break*/, 23];
                case 22:
                    error_2 = _a.sent();
                    console.error('[Worker] Error in polling loop:', error_2);
                    return [3 /*break*/, 23];
                case 23: return [2 /*return*/];
            }
        });
    });
}
// Poll every 2 seconds
setInterval(processOutgoingQueue, 2000);
