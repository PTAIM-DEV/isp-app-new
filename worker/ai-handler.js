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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
var prisma = new PrismaClient();
var AIHandler = /** @class */ (function () {
    function AIHandler() {
        this.openai = null;
    }
    AIHandler.prototype.getClient = function () {
        return __awaiter(this, void 0, void 0, function () {
            var apiKeySetting;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.openai)
                            return [2 /*return*/, this.openai];
                        return [4 /*yield*/, prisma.systemSetting.findUnique({
                                where: { key: 'openai_api_key' }
                            })];
                    case 1:
                        apiKeySetting = _a.sent();
                        if (!(apiKeySetting === null || apiKeySetting === void 0 ? void 0 : apiKeySetting.value)) {
                            return [2 /*return*/, null];
                        }
                        this.openai = new OpenAI({
                            apiKey: apiKeySetting.value,
                        });
                        return [2 /*return*/, this.openai];
                }
            });
        });
    };
    AIHandler.prototype.generateResponse = function (senderJid, userMessage) {
        return __awaiter(this, void 0, void 0, function () {
            var client, systemPromptSetting, systemPrompt, history_1, messages, lastMessage, conversation, completion, responseContent, usage, chat, error_1;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 8, , 9]);
                        console.log("[AI Handler] Starting response generation for ".concat(senderJid));
                        return [4 /*yield*/, this.getClient()];
                    case 1:
                        client = _c.sent();
                        if (!client) {
                            console.warn('[AI Handler] OpenAI client not available. Check API key configuration.');
                            return [2 /*return*/, null]; // AI not configured
                        }
                        return [4 /*yield*/, prisma.aIPrompt.findUnique({
                                where: { key: 'system_prompt' }
                            })];
                    case 2:
                        systemPromptSetting = _c.sent();
                        systemPrompt = (systemPromptSetting === null || systemPromptSetting === void 0 ? void 0 : systemPromptSetting.prompt) || 'You are a helpful assistant for an ISP company. Answer in Bahasa Indonesia.';
                        console.log("[AI Handler] System prompt loaded: ".concat(systemPrompt.substring(0, 50), "..."));
                        return [4 /*yield*/, prisma.whatsAppMessage.findMany({
                                where: {
                                    chat: { jid: senderJid }
                                },
                                orderBy: { createdAt: 'desc' },
                                take: 10,
                            })];
                    case 3:
                        history_1 = _c.sent();
                        console.log("[AI Handler] Found ".concat(history_1.length, " messages in history"));
                        messages = history_1.reverse().map(function (msg) { return ({
                            role: (msg.sender === 'ME' ? 'assistant' : 'user'),
                            content: msg.content
                        }); });
                        lastMessage = messages[messages.length - 1];
                        if (!lastMessage || lastMessage.content !== userMessage) {
                            messages.push({
                                role: 'user',
                                content: userMessage
                            });
                        }
                        conversation = __spreadArray([
                            { role: 'system', content: systemPrompt }
                        ], messages, true);
                        console.log("[AI Handler] Sending ".concat(conversation.length, " messages to OpenAI"));
                        return [4 /*yield*/, client.chat.completions.create({
                                model: 'gpt-4o-mini',
                                messages: conversation,
                                temperature: 0.7,
                            })];
                    case 4:
                        completion = _c.sent();
                        responseContent = ((_b = (_a = completion.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || 'Maaf, saya tidak dapat memproses permintaan Anda saat ini.';
                        usage = completion.usage;
                        console.log("[AI Handler] Received response: ".concat(responseContent.substring(0, 50), "..."));
                        console.log("[AI Handler] Token usage: ".concat((usage === null || usage === void 0 ? void 0 : usage.total_tokens) || 0, " tokens"));
                        if (!usage) return [3 /*break*/, 7];
                        return [4 /*yield*/, prisma.whatsAppChat.findUnique({ where: { jid: senderJid } })];
                    case 5:
                        chat = _c.sent();
                        if (!chat) return [3 /*break*/, 7];
                        return [4 /*yield*/, prisma.aITokenUsage.create({
                                data: {
                                    model: completion.model,
                                    promptTokens: usage.prompt_tokens,
                                    completionTokens: usage.completion_tokens,
                                    totalTokens: usage.total_tokens,
                                    chatId: chat.id,
                                    purpose: 'chat_response'
                                }
                            })];
                    case 6:
                        _c.sent();
                        _c.label = 7;
                    case 7: return [2 /*return*/, responseContent];
                    case 8:
                        error_1 = _c.sent();
                        console.error('AI Generation Error:', error_1);
                        return [2 /*return*/, null]; // Return null to indicate failure/no response
                    case 9: return [2 /*return*/];
                }
            });
        });
    };
    return AIHandler;
}());
export { AIHandler };
export var aiHandler = new AIHandler();
