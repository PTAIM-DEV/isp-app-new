
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
    try {
        const [minDelay, maxDelay, variables, ragKnowledge, systemPromptAdmin, systemPromptCustomer, aiReplyEnabled] = await Promise.all([
            prisma.systemSetting.findUnique({ where: { key: 'WA_DELAY_MIN' } }),
            prisma.systemSetting.findUnique({ where: { key: 'WA_DELAY_MAX' } }),
            prisma.systemSetting.findUnique({ where: { key: 'BOT_VARIABLES' } }),
            prisma.systemSetting.findUnique({ where: { key: 'RAG_KNOWLEDGE' } }),
            prisma.aIPrompt.findUnique({ where: { key: 'system_prompt_admin' } }),
            prisma.aIPrompt.findUnique({ where: { key: 'system_prompt_customer' } }),
            prisma.systemSetting.findUnique({ where: { key: 'WA_AI_REPLY' } })
        ]);

        return NextResponse.json({
            minDelay: minDelay ? parseInt(minDelay.value) : 60,
            maxDelay: maxDelay ? parseInt(maxDelay.value) : 180,
            // Default to true if not set, or parse boolean string
            aiReplyEnabled: aiReplyEnabled ? aiReplyEnabled.value !== 'false' : true,
            variables: variables ? JSON.parse(variables.value) : {},
            ragKnowledge: ragKnowledge ? ragKnowledge.value : '',
            systemPromptAdmin: systemPromptAdmin ? systemPromptAdmin.prompt : '',
            systemPromptCustomer: systemPromptCustomer ? systemPromptCustomer.prompt : ''
        });
    } catch (error) {
        console.error('Error fetching settings:', error);
        return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { minDelay, maxDelay, variables, ragKnowledge, systemPrompt, aiReplyEnabled } = body;

        // Save Delays
        if (minDelay !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: 'WA_DELAY_MIN' },
                update: { value: String(minDelay) },
                create: { key: 'WA_DELAY_MIN', value: String(minDelay), description: 'Minimum delay between WhatsApp messages (seconds)' }
            });
        }

        if (maxDelay !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: 'WA_DELAY_MAX' },
                update: { value: String(maxDelay) },
                create: { key: 'WA_DELAY_MAX', value: String(maxDelay), description: 'Maximum delay between WhatsApp messages (seconds)' }
            });
        }

        // Save AI Reply Toggle
        if (aiReplyEnabled !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: 'WA_AI_REPLY' },
                update: { value: String(aiReplyEnabled) },
                create: { key: 'WA_AI_REPLY', value: String(aiReplyEnabled), description: 'Master toggle for AI Auto-Reply' }
            });
        }

        // Save Variables
        if (variables !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: 'BOT_VARIABLES' },
                update: { value: JSON.stringify(variables) },
                create: { key: 'BOT_VARIABLES', value: JSON.stringify(variables), description: 'Dynamic variables for the bot' }
            });
        }

        // Save RAG Knowledge
        if (ragKnowledge !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: 'RAG_KNOWLEDGE' },
                update: { value: ragKnowledge },
                create: { key: 'RAG_KNOWLEDGE', value: ragKnowledge, description: 'Knowledge base content for RAG' }
            });
        }

        // Save System Prompts
        if (body.systemPromptAdmin !== undefined) {
            await prisma.aIPrompt.upsert({
                where: { key: 'system_prompt_admin' },
                update: { prompt: body.systemPromptAdmin },
                create: { key: 'system_prompt_admin', prompt: body.systemPromptAdmin, description: 'System prompt for Admins' }
            });
        }

        if (body.systemPromptCustomer !== undefined) {
            await prisma.aIPrompt.upsert({
                where: { key: 'system_prompt_customer' },
                update: { prompt: body.systemPromptCustomer },
                create: { key: 'system_prompt_customer', prompt: body.systemPromptCustomer, description: 'System prompt for Customers' }
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving settings:', error);
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }
}
