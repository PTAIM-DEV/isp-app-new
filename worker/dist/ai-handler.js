import OpenAI from 'openai';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
export class AIHandler {
    constructor() {
        this.openai = null;
    }
    async getClient() {
        if (this.openai)
            return this.openai;
        const apiKeySetting = await prisma.systemSetting.findUnique({
            where: { key: 'openai_api_key' }
        });
        if (!apiKeySetting?.value) {
            return null;
        }
        this.openai = new OpenAI({
            apiKey: apiKeySetting.value,
        });
        return this.openai;
    }
    async generateResponse(senderJid, userMessage) {
        try {
            console.log(`[AI Handler] Starting response generation for ${senderJid}`);
            const client = await this.getClient();
            if (!client) {
                console.warn('[AI Handler] OpenAI client not available. Check API key configuration.');
                return null; // AI not configured
            }
            // 1. Get System Prompt
            const systemPromptSetting = await prisma.aIPrompt.findUnique({
                where: { key: 'system_prompt' }
            });
            const systemPrompt = systemPromptSetting?.prompt || 'You are a helpful assistant for an ISP company. Answer in Bahasa Indonesia.';
            console.log(`[AI Handler] System prompt loaded: ${systemPrompt.substring(0, 50)}...`);
            // 2. Get Conversation History (Context)
            // We'll fetch last 10 messages for context
            const history = await prisma.whatsAppMessage.findMany({
                where: {
                    chat: { jid: senderJid }
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });
            console.log(`[AI Handler] Found ${history.length} messages in history`);
            // Reverse to chronological order
            const messages = history.reverse().map(msg => ({
                role: (msg.sender === 'ME' ? 'assistant' : 'user'),
                content: msg.content
            }));
            // Add current user message if not already in history
            const lastMessage = messages[messages.length - 1];
            if (!lastMessage || lastMessage.content !== userMessage) {
                messages.push({
                    role: 'user',
                    content: userMessage
                });
            }
            // Construct messages array
            const conversation = [
                { role: 'system', content: systemPrompt },
                ...messages,
            ];
            console.log(`[AI Handler] Sending ${conversation.length} messages to OpenAI`);
            // 3. Call OpenAI
            const completion = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: conversation,
                temperature: 0.7,
            });
            const responseContent = completion.choices[0]?.message?.content || 'Maaf, saya tidak dapat memproses permintaan Anda saat ini.';
            const usage = completion.usage;
            console.log(`[AI Handler] Received response: ${responseContent.substring(0, 50)}...`);
            console.log(`[AI Handler] Token usage: ${usage?.total_tokens || 0} tokens`);
            // 4. Track Token Usage
            if (usage) {
                const chat = await prisma.whatsAppChat.findUnique({ where: { jid: senderJid } });
                if (chat) {
                    await prisma.aITokenUsage.create({
                        data: {
                            model: completion.model,
                            promptTokens: usage.prompt_tokens,
                            completionTokens: usage.completion_tokens,
                            totalTokens: usage.total_tokens,
                            chatId: chat.id,
                            purpose: 'chat_response'
                        }
                    });
                }
            }
            return responseContent;
        }
        catch (error) {
            console.error('AI Generation Error:', error);
            return null; // Return null to indicate failure/no response
        }
    }
}
export const aiHandler = new AIHandler();
