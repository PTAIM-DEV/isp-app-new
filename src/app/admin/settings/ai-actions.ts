'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateAIConfig(formData: FormData) {
    const apiKey = formData.get('apiKey') as string;
    const systemPrompt = formData.get('systemPrompt') as string;

    console.log('Updating AI Config:', { apiKeyLength: apiKey?.length, systemPromptLength: systemPrompt?.length });

    try {
        // Update API Key
        if (apiKey) {
            await prisma.systemSetting.upsert({
                where: { key: 'openai_api_key' },
                update: { value: apiKey },
                create: { key: 'openai_api_key', value: apiKey, description: 'OpenAI API Key' }
            });
        }

        // Update System Prompt
        if (systemPrompt) {
            await prisma.aIPrompt.upsert({
                where: { key: 'system_prompt' },
                update: { prompt: systemPrompt },
                create: { key: 'system_prompt', prompt: systemPrompt, description: 'Main System Prompt for WhatsApp Bot' }
            });
        }

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Failed to update AI config:', error);
        return { success: false, error: 'Failed to update configuration' };
    }
}

export async function getAIConfig() {
    const apiKey = await prisma.systemSetting.findUnique({ where: { key: 'openai_api_key' } });
    const systemPrompt = await prisma.aIPrompt.findUnique({ where: { key: 'system_prompt' } });

    return {
        apiKey: apiKey?.value || '',
        systemPrompt: systemPrompt?.prompt || 'You are a helpful assistant for an ISP company.',
    };
}

export async function getTokenUsageStats() {
    // Get total usage
    const totalUsage = await prisma.aITokenUsage.aggregate({
        _sum: {
            totalTokens: true,
            promptTokens: true,
            completionTokens: true,
        }
    });

    // Get usage by day (last 7 days) - Raw query for date grouping
    // Prisma doesn't support date grouping easily, so we'll fetch recent records and group in JS for simplicity
    // or use a raw query if performance is critical. For now, simple JS grouping.
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentUsage = await prisma.aITokenUsage.findMany({
        where: {
            createdAt: {
                gte: sevenDaysAgo
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    return {
        total: totalUsage._sum,
        recent: recentUsage
    };
}
export async function generateReminderTemplateAction(
    interval: string,
    type: 'whatsapp' | 'email_subject' | 'email_body' | 'safe_greeting' | 'safe_apology' | 'safe_intro'
) {
    try {
        const { aiService } = await import('@/lib/ai-service');

        let target = '';
        let context = '';
        let tone = '';

        if (type === 'safe_greeting' || type === 'safe_apology' || type === 'safe_intro') {
            switch (type) {
                case 'safe_greeting':
                    context = 'Safe Flow Step 1: Greeting. Need varied greetings based on time (Pagi/Siang/Sore/Malam).';
                    tone = 'Friendly, polite, natural human-like.';
                    target = `Generate a list of 5-10 short, natural-sounding greetings in Bahasa Indonesia. 
                    - Vary the time (Pagi/Siang/Sore/Malam) or make it general.
                    - Example: "Selamat Pagi kak", "Halo kak", "Permisi kak, selamat siang".
                    - OUTPUT: Just the list, one per line. No numbering.`;
                    break;
                case 'safe_apology':
                    context = 'Safe Flow Step 2: Apology for disturbing. Sent 10-30 seconds after greeting.';
                    tone = 'Polite, humble.';
                    target = `Generate a list of 5-10 short apologies for disturbing in Bahasa Indonesia.
                    - Example: "Maaf mengganggu waktunya sebentar", "Mohon maaf ganggu kak", "Punten kak, maaf ganggu".
                    - OUTPUT: Just the list, one per line. No numbering.`;
                    break;
                case 'safe_intro':
                    context = 'Safe Flow Step 3: Introduction/Bridge. Sent before the main billing info.';
                    tone = 'Direct but polite.';
                    target = `Generate a list of 5-10 short intro phrases bridging to the billing topic in Bahasa Indonesia.
                    - Example: "saya mau reminder ada tagihan internet", "mau infokan tagihan bulan ini", "cuma mau mengingatkan tagihan".
                    - OUTPUT: Just the list, one per line. No numbering.`;
                    break;
            }
        } else {
            switch (interval) {
                case 'H-5':
                case 'D-5':
                    context = 'This is a polite early reminder sent 5 days BEFORE the due date.';
                    tone = 'Friendly, helpful, polite. Not aggressive.';
                    break;
                case 'H-2':
                case 'D-2':
                    context = 'This is a gentle reminder sent 2 days BEFORE the due date.';
                    tone = 'Friendly but clear. Reminding them to prepare payment.';
                    break;
                case 'H-0':
                case 'D-0':
                    context = 'This is a reminder sent ON THE DUE DATE today.';
                    tone = 'Professional, urgent but polite. "Today is the due date".';
                    break;
                case 'D+1':
                    context = 'This is a reminder sent 1 day AFTER the due date. The payment is LATE.';
                    tone = 'Firm but polite. Asking to pay immediately to avoid service interruption.';
                    break;
                case 'D+2':
                case 'D+3':
                    context = 'This is a reminder sent 2-3 days AFTER the due date. The payment is OVERDUE.';
                    tone = 'Urgent. Warning about potential service suspension.';
                    break;
                case 'D+5':
                    context = 'This is the FINAL reminder sent 5 days AFTER the due date. The service will be BLOCKED.';
                    tone = 'Very Urgent, Strict. "Service will be suspended automatically".';
                    break;
                default:
                    context = 'General payment reminder.';
                    tone = 'Professional.';
            }

            if (type === 'whatsapp') {
                target = `Create a WhatsApp message. Keep it concise, easy to read on mobile. Use emojis sparingly but effectively. Do not use Markdown strictly, but you can use *bold* or _italic_.
                Available variables: {{customerName}}, {{invoiceNumber}}, {{amount}}, {{dueDate}}, {{paymentLink}}, {{daysUntilDue}}.`;
            } else if (type === 'email_subject') {
                target = `Create a catchy, clear Email Subject Line. Short and direct.`;
            } else if (type === 'email_body') {
                target = `Create an Email Body using HTML format. Use <p>, <br>, <strong> tags. Make it professional and well-structured.
                Available variables: {{customerName}}, {{invoiceNumber}}, {{amount}}, {{dueDate}}, {{paymentLink}}, {{daysUntilDue}}.`;
            }
        }

        const systemPrompt = `You are an expert copywriter for an ISP (Internet Service Provider) company in Indonesia. 
        Your goal is to write effective payment reminders contents.
        Use Bahasa Indonesia.`;

        const userPrompt = `
        Task: Write content for ${type}.
        Context: ${context}
        Tone: ${tone}
        ${target}
        
        Output only the content, no explanations.
        `;

        const content = await aiService.generateCompletion(systemPrompt, userPrompt);

        if (!content) {
            return { success: false, error: 'AI failed to generate content.' };
        }

        // Clean up markdown code blocks if any (sometimes AI puts them)
        const cleanContent = content.replace(/^```(html|markdown)?\n/, '').replace(/\n```$/, '');

        return { success: true, content: cleanContent };

    } catch (error: any) {
        console.error('Generate Template Error:', error);
        return { success: false, error: 'Failed to generate template' };
    }
}
