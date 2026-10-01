import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';
import { evolutionApi } from '@/lib/evolution-api';

// Tools Definition
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
    {
        type: 'function',
        function: {
            name: 'get_unpaid_invoices',
            description: 'Get a list of users who have not paid their invoices. Strictly for Admin use only.',
            parameters: {
                type: 'object',
                properties: {
                    limit: {
                        type: 'number',
                        description: 'Limit the number of results',
                        default: 10
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'get_revenue_stats',
            description: 'Get revenue statistics for the current month or total. Strictly for Admin use only.',
            parameters: {
                type: 'object',
                properties: {
                    period: {
                        type: 'string',
                        enum: ['this_month', 'last_month', 'total'],
                        description: 'The period to calculate revenue for',
                        default: 'this_month'
                    }
                }
            }
        }
    },
    {
        type: 'function',
        function: {
            name: 'check_customer_status',
            description: 'Check status of a customer (internet, subscription, bills) by name or phone.',
            parameters: {
                type: 'object',
                properties: {
                    query: {
                        type: 'string',
                        description: 'Name or phone number to search for'
                    }
                },
                required: ['query']
            }
        }
    }
];

export class AIService {
    private openai: OpenAI | null = null;

    private async getClient() {
        if (this.openai) return this.openai;

        // Try DB first
        let apiKey = null;
        try {
            const apiKeySetting = await prisma.systemSetting.findUnique({
                where: { key: 'openai_api_key' }
            });
            apiKey = apiKeySetting?.value;
        } catch (e) {
            console.warn('[AIService] Failed to check DB for key, trying env', e);
        }

        // Try Env if not in DB
        if (!apiKey) {
            apiKey = process.env.OPENAI_API_KEY || null;
        }

        if (!apiKey) {
            console.warn('[AIService] No API Key found in DB or Env');
            return null;
        }

        try {
            this.openai = new OpenAI({
                apiKey: apiKey,
            });
        } catch (e) {
            console.error('[AIService] Failed to initialize OpenAI client', e);
            return null;
        }

        return this.openai;
    }

    private async checkUserRole(jid: string): Promise<'ADMIN' | 'USER'> {
        const phone = jid.split('@')[0];
        // Handle common phone variations (08..., 628...)
        const searchPhones = [phone, phone.replace(/^62/, '0'), phone.replace(/^0/, '62')];

        const user = await prisma.user.findFirst({
            where: {
                phone: { in: searchPhones },
                role: 'ADMIN' // Only find if ADMIN
            }
        });

        return user ? 'ADMIN' : 'USER';
    }

    private async handleToolCall(toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall, role: 'ADMIN' | 'USER'): Promise<string> {
        if (role !== 'ADMIN') {
            return "ACCESS DENIED. The user does not have permission to access database tools. Tell them they need Admin privileges.";
        }

        if (toolCall.type !== 'function') {
            return "Error: Only function tools are supported.";
        }

        const args = JSON.parse(toolCall.function.arguments);
        const name = toolCall.function.name;

        console.log(`[AI-Tool] Executing ${name} with args:`, args);

        try {
            switch (name) {
                case 'get_unpaid_invoices': {
                    const invoices = await prisma.invoice.findMany({
                        where: {
                            status: 'UNPAID',
                            user: { deletedAt: null } // Exclude deleted users
                        },
                        take: args.limit || 10,
                        include: { user: { select: { name: true, phone: true } } },
                        orderBy: { dueDate: 'asc' }
                    });

                    if (invoices.length === 0) return "No unpaid invoices found.";

                    return JSON.stringify(invoices.map(inv => ({
                        customer: inv.user.name,
                        amount: inv.amount,
                        dueDate: inv.dueDate,
                        description: inv.description
                    })));
                }

                case 'get_revenue_stats': {
                    // Adjust to WIB (UTC+7) for accurate monthly calculation relative to Indonesian users
                    // Create date object from current UTC time
                    const utcNow = new Date();
                    // Setup formatter for Jakarta/WIB
                    const now = new Date(utcNow.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));

                    let dateFilter = {};

                    if (args.period === 'this_month') {
                        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        // Convert back to UTC for Prisma query if needed, but Prisma handles Date objects as absolute points in time.
                        // However, since paidAt is stored as DateTime (timestamp), we need to ensure the RANGE covers the WIB month.
                        // Start of WIB month in UTC: (Year, Month, 1, 00:00) - 7 hours

                        // Let's keep it simple: Define Start/End in WIB, then subtract timezone offset to get UTC query bounds.

                        // Start of This Month (WIB)
                        const startWIB = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                        const startUTC = new Date(startWIB.getTime() - (7 * 3600 * 1000)); // To UTC

                        dateFilter = { gte: startUTC };
                    } else if (args.period === 'last_month') {
                        const startLastMonthWIB = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
                        const endLastMonthWIB = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); // End of last month

                        const startUTC = new Date(startLastMonthWIB.getTime() - (7 * 3600 * 1000));
                        const endUTC = new Date(endLastMonthWIB.getTime() - (7 * 3600 * 1000));

                        dateFilter = { gte: startUTC, lte: endUTC };
                    }
                    else if (args.period === 'total') {
                        // No filter
                        dateFilter = {};
                    }

                    const result = await prisma.invoice.aggregate({
                        where: {
                            status: 'PAID',
                            paidAt: dateFilter
                        },
                        _sum: { amount: true },
                        _count: { id: true }
                    });

                    return JSON.stringify({
                        period: args.period,
                        totalRevenue: result._sum.amount || 0,
                        transactionCount: result._count.id
                    });
                }

                case 'check_customer_status': {
                    const users = await prisma.user.findMany({
                        where: {
                            OR: [
                                { name: { contains: args.query, mode: 'insensitive' } },
                                { phone: { contains: args.query } }
                            ],
                            deletedAt: null // Exclude deleted users
                        },
                        take: 3,
                        include: {
                            subscription: true,
                            invoices: {
                                where: { status: 'UNPAID' },
                                select: { amount: true, status: true, dueDate: true }
                            },
                            installation: {
                                select: { status: true, scheduledDate: true }
                            }
                        }
                    });

                    if (users.length === 0) return "Customer not found.";

                    return JSON.stringify(users.map(u => ({
                        name: u.name,
                        status: u.status,
                        internet_package: u.subscription?.planName || 'None',
                        installation: u.installation?.status || 'No record',
                        unpaid_invoices: u.invoices.length,
                        total_unpaid: u.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0)
                    })));
                }

                default:
                    return "Tool execution error: Unknown tool.";
            }
        } catch (error: any) {
            console.error(`[AI-Tool] Error executing ${name}:`, error);
            return `Error executing tool: ${error.message}`;
        }
    }

    async generateResponse(senderJid: string, userMessage: string) {
        try {
            console.log(`[AI Handler] Starting response generation for ${senderJid}`);

            const client = await this.getClient();
            if (!client) {
                console.warn('[AI Handler] OpenAI client not available.');
                return null;
            }

            // Check Role
            const userRole = await this.checkUserRole(senderJid);
            console.log(`[AI Handler] User Role for ${senderJid}: ${userRole}`);

            // 1. Get System Prompt based on Role
            let promptKey = 'system_prompt_customer';
            if (userRole === 'ADMIN') {
                promptKey = 'system_prompt_admin';
            }

            const systemPromptSetting = await prisma.aIPrompt.findUnique({
                where: { key: promptKey }
            });

            // Default fallback if DB is empty (Migration should have handled this, but for safety)
            let systemPrompt = systemPromptSetting?.prompt;

            if (!systemPrompt) {
                // Fallback hardcoded (should rarely happen now)
                systemPrompt = 'You are a helpful assistant for an ISP company. Answer in Bahasa Indonesia.';
                if (userRole === 'ADMIN') {
                    systemPrompt += ' You are speaking to an ADMIN. You have access to tools.';
                } else {
                    systemPrompt += ' You are speaking to a customer.';
                }
            }

            // 2. Get Conversation History
            const history = await prisma.whatsAppMessage.findMany({
                where: { chat: { jid: senderJid } },
                orderBy: { createdAt: 'desc' },
                take: 10,
            });

            const messages = history.reverse().map(msg => ({
                role: (msg.sender === 'ME' ? 'assistant' : 'user') as 'assistant' | 'user',
                content: msg.content
            }));

            // Add current message
            messages.push({ role: 'user', content: userMessage });

            const conversation = [
                { role: 'system', content: systemPrompt },
                ...messages,
            ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

            // 3. Call OpenAI (First Pass)
            let completion = await client.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: conversation,
                tools: userRole === 'ADMIN' ? tools : undefined,
                tool_choice: userRole === 'ADMIN' ? 'auto' : undefined,
                temperature: 0.7,
            });

            let message = completion.choices[0]?.message;

            // 4. Handle Tool Calls
            if (message?.tool_calls) {
                conversation.push(message);

                for (const toolCall of message.tool_calls) {
                    const toolResult = await this.handleToolCall(toolCall, userRole);

                    conversation.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: toolResult
                    });
                }

                // Call OpenAI again
                completion = await client.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: conversation,
                    temperature: 0.7,
                });

                message = completion.choices[0]?.message;
            }



            let responseContent = message?.content || 'Maaf, saya tidak dapat memproses permintaan Anda.';

            if (responseContent.includes('[FORWARD_TO_SALES]')) {
                await this.forwardToSales(senderJid, userMessage);
                return 'Pertanyaan Anda akan saya sampaikan ke Sales kami yang bertugas. Mohon tunggu sebentar.';
            }

            if (responseContent.includes('[ESCALATE_TECHNICAL]')) {
                // Escalate to Sales and Technical Head (Dedi)
                await this.forwardToTechnical(senderJid, userMessage);

                // Remove the tag from the response to show the user the natural apology
                responseContent = responseContent.replace('[ESCALATE_TECHNICAL]', '').trim();
            }

            // Track Token Usage
            if (completion.usage) {
                const chat = await prisma.whatsAppChat.findUnique({ where: { jid: senderJid } });
                if (chat) {
                    await prisma.aITokenUsage.create({
                        data: {
                            model: completion.model,
                            promptTokens: completion.usage.prompt_tokens,
                            completionTokens: completion.usage.completion_tokens,
                            totalTokens: completion.usage.total_tokens,
                            chatId: chat.id,
                            purpose: 'chat_response_with_tools'
                        }
                    });
                }
            }

            return responseContent;

        } catch (error) {
            console.error('AI Generation Error:', error);
            return null;
        }
    }
    async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string | null> {
        try {
            const client = await this.getClient();
            if (!client) {
                console.warn('[AI Handler] OpenAI client not available.');
                return null;
            }

            const completion = await client.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.7,
            });

            // Track Token Usage (Optional: Associate with a system 'chat' or leave blank)
            if (completion.usage) {
                // Note: We don't have a chatId here, so we might skip detailed logging or log to a system log
                const usage = completion.usage;
                console.log(`[AI Gen] Usage: ${usage.total_tokens} tokens`);

                // Optionally log to DB if we had a general system chat ID
            }

            return completion.choices[0]?.message?.content || null;
        } catch (error) {
            console.error('AI Completion Error:', error);
            return null;
        }
    }

    async processImageMessage(jid: string, caption?: string): Promise<string> {
        try {
            const phoneNumber = jid.split('@')[0];
            const searchPhones = [phoneNumber, phoneNumber.replace(/^62/, '0'), phoneNumber.replace(/^0/, '62')];

            const user = await prisma.user.findFirst({
                where: { phone: { in: searchPhones } },
                include: {
                    invoices: {
                        where: { status: 'UNPAID' },
                        orderBy: { dueDate: 'asc' }
                    }
                }
            });

            if (!user) return 'Terima kasih atas kiriman gambarnya.';

            const unpaidInvoices = user.invoices;

            if (unpaidInvoices.length > 0) {
                // Determine if this is likely a payment proof logic check
                // For now, assume any image sent by a user with unpaid invoices is a payment proof candidate.

                // Real-time check: Re-fetch invoice status from DB to ensure it hasn't just been updated by webhook
                // (Though 'user.invoices' above is already fresh from DB query)

                // If the user sends an image, and they have UNPAID invoices, we acknowledge it as proof.
                // We do NOT mark it as PAID automatically without manual or gateway confirmation.
                // But we check if Xendit ALREADY marked it paid (e.g. race condition or just timing)

                // Since we query UNPAID status above, if there are results, it means system THINKS it is unpaid.
                // If the user says "sudah bayar" or sends image, we say:

                return 'Terima kasih bukti pembayarannya. Sistem kami akan segera memverifikasi pembayaran Anda. Mohon tunggu sebentar.';
            } else {
                // No unpaid invoices found.
                // It might be that Xendit just updated it to PAID.
                // Check if they have ANY paid invoice in the last 24 hours (extended window)
                const recentPaid = await prisma.invoice.findFirst({
                    where: {
                        userId: user.id,
                        status: 'PAID',
                        paidAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                    }
                });

                if (recentPaid) {
                    return 'Terima kasih. Data kami menunjukkan seluruh tagihan Anda untuk periode ini sudah LUNAS. Pembayaran Anda telah kami terima.';
                }

                // If no recent paid, and no unpaid, they are totally clear.
                return 'Terima kasih gambarnya. Saat ini tidak ada tagihan tertunggak pada akun Anda.';
            }

        } catch (error) {
            console.error('Process Image Error:', error);
            return 'Terima kasih gambarnya.';
        }
    }

    async forwardToSales(customerJid: string, message: string) {
        try {
            const phoneNumber = customerJid.split('@')[0];
            const searchPhones = [phoneNumber, phoneNumber.replace(/^62/, '0'), phoneNumber.replace(/^0/, '62')];

            const user = await prisma.user.findFirst({
                where: { phone: { in: searchPhones } },
                include: { salesPerson: true }
            });

            if (user && user.salesPerson && user.salesPerson.phone) {
                const salesPhone = user.salesPerson.phone;
                let salesJid = salesPhone.replace(/\D/g, '');
                if (salesJid.startsWith('0')) salesJid = '62' + salesJid.slice(1);
                salesJid += '@s.whatsapp.net';

                // Fetch context (Last 5 messages)
                const lastMessages = await prisma.whatsAppMessage.findMany({
                    where: { chat: { jid: customerJid } },
                    orderBy: { createdAt: 'desc' },
                    take: 5
                });

                // Format context: Reverse to chronological order
                const contextText = lastMessages.reverse().map(m => {
                    const sender = m.sender === 'ME' ? 'Bot' : 'Cust';
                    return `[${sender}] ${m.content}`;
                }).join('\n');

                const forwardText = `*[FORWARD DARI CUSTOMER]*\n\nNama: ${user.name}\nNo: ${user.phone}\n\n*5 Chat Terakhir:*\n${contextText}\n\n_Mohon segera direspon._`;

                await evolutionApi.sendTextMessage(salesJid, forwardText);
                console.log(`[Forward] Message from ${user.name} forwarded to sales ${user.salesPerson.name}`);

                // Confirm to Customer
                await evolutionApi.sendTextMessage(customerJid, `✅ Pelaporan berhasil.\n\nPesan Anda sudah saya teruskan ke Sales kami (${user.salesPerson.name}).\nMohon ditunggu, Sales kami akan segera merespon pesan Anda.`);
            } else {
                console.log('[Forward] No sales person assigned or found for user', phoneNumber);
                await evolutionApi.sendTextMessage(customerJid, 'Mohon maaf, saya belum menemukan data Sales yang ditugaskan untuk Anda. Saya akan meneruskan ini ke Admin pusat.');
                // Fallback to Admin (Optional, logic could be expanded here)
            }
        } catch (error) {
            console.error('Forward to Sales Error:', error);
        }
    }

    async forwardToTechnical(customerJid: string, message: string) {
        try {
            const phoneNumber = customerJid.split('@')[0];
            const searchPhones = [phoneNumber, phoneNumber.replace(/^62/, '0'), phoneNumber.replace(/^0/, '62')];

            const user = await prisma.user.findFirst({
                where: { phone: { in: searchPhones } },
                include: { salesPerson: true }
            });

            if (!user) return;

            const customerInfo = `Nama: ${user.name}\nNo: ${user.phone}\nSales: ${user.salesPerson?.name || '-'}`;
            const forwardText = `*[LASTMILE - LAPORAN GANGGUAN]*\n\n${customerInfo}\n\nKeluhan:\n"${message}"\n\n_Mohon segera dicek._`;

            // 1. Forward to Sales (if exists)
            if (user.salesPerson && user.salesPerson.phone) {
                let salesJid = user.salesPerson.phone.replace(/\D/g, '');
                if (salesJid.startsWith('0')) salesJid = '62' + salesJid.slice(1);
                salesJid += '@s.whatsapp.net';
                await evolutionApi.sendTextMessage(salesJid, forwardText);
            }

            // 2. Forward to Head Technician (Dedi)
            const headTechPhone = '6281340300880';
            const headTechJid = headTechPhone + '@s.whatsapp.net';

            await evolutionApi.sendTextMessage(headTechJid, forwardText);

            console.log(`[Escalate] Technical issue from ${user.name} forwarded to Sales & Dedi.`);

            // Confirm to Customer
            // Note: The AI already generates a polite apology in 'responseContent', 
            // but we can add a system confirmation to be sure. 
            // However, for technical escalation, the 'generateResponse' logic removes the tag and returns the AI's natural apology.
            // If we send another message here, it might be double. 
            // BUT, the user specifically asked for "update kembali ke pelanggan apakah task berhasil".
            // So let's add a small system confirmation "Laporan Terkirim".

            await evolutionApi.sendTextMessage(customerJid, `✅ Laporan Terkirim.\n\nPesan Anda sudah masuk ke tim teknis dan sales kami. Tiket gangguan telah dibuat.`);


        } catch (error) {
            console.error('Forward to Technical Error:', error);
        }
    }
}

export const aiService = new AIService();
