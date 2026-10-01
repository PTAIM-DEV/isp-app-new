
import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    try {
        const { currentPrompt, instruction } = await request.json();

        if (!instruction) {
            return NextResponse.json({ error: 'Instruction is required' }, { status: 400 });
        }

        // Initialize OpenAI
        const apiKeySetting = await prisma.systemSetting.findUnique({
            where: { key: 'openai_api_key' }
        });
        const apiKey = apiKeySetting?.value || process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ error: 'OpenAI API Key not found' }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey });

        const systemPrompt = `You are an expert Prompt Engineer for LLMs. 
Your goal is to rewrite, refine, or improve a given System Prompt based on the user's specific instruction.
- You must preserve critical existing instructions unless explicitly asked to remove them.
- Critical instructions often include: output tags (e.g. [ESCALATE_TECHNICAL]), JSON formats, or specific behavioral restrictions.
- Improve clarity, tone, and robustness.
- Output ONLY the new revised system prompt. Do not add conversational filler like "Here is the revised prompt:".`;

        const userContent = `CURRENT PROMPT:
${currentPrompt || '(Empty)'}

INSTRUCTION:
${instruction}`;

        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            temperature: 0.7,
        });

        const newPrompt = completion.choices[0]?.message?.content || currentPrompt;

        return NextResponse.json({ prompt: newPrompt });

    } catch (error: any) {
        console.error('Prompt Gen Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to generate prompt' }, { status: 500 });
    }
}
