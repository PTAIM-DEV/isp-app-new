import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';

const prisma = new PrismaClient();

async function testAI() {
    console.log('🧪 Testing AI Handler...\n');

    // Check OpenAI API Key
    const apiKeySetting = await prisma.systemSetting.findUnique({
        where: { key: 'openai_api_key' }
    });

    if (!apiKeySetting?.value) {
        console.error('❌ OpenAI API Key tidak ditemukan!');
        console.log('   Silakan set API key di: /admin/settings');
        await prisma.$disconnect();
        return;
    }

    console.log('✅ OpenAI API Key ditemukan\n');

    // Check System Prompt
    const systemPromptSetting = await prisma.aIPrompt.findUnique({
        where: { key: 'system_prompt' }
    });
    const systemPrompt = systemPromptSetting?.prompt || 'You are a helpful assistant for an ISP company. Answer in Bahasa Indonesia.';
    console.log(`📝 System Prompt: ${systemPrompt.substring(0, 100)}...\n`);

    // Initialize OpenAI
    const openai = new OpenAI({
        apiKey: apiKeySetting.value,
    });

    const mockJid = '628123456789@s.whatsapp.net';
    const mockMessage = 'Halo, apa kabar?';

    console.log(`📤 Sending message: "${mockMessage}"`);
    console.log(`📱 To JID: ${mockJid}\n`);

    try {
        // Get conversation history (if any)
        const history = await prisma.whatsAppMessage.findMany({
            where: {
                chat: { jid: mockJid }
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        });

        console.log(`📚 Found ${history.length} messages in history\n`);

        // Build conversation
        const messages = history.reverse().map(msg => ({
            role: (msg.sender === 'ME' ? 'assistant' : 'user') as 'assistant' | 'user',
            content: msg.content
        }));

        messages.push({
            role: 'user',
            content: mockMessage
        });

        const conversation = [
            { role: 'system', content: systemPrompt },
            ...messages,
        ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

        console.log(`🔄 Calling OpenAI API...\n`);

        // Call OpenAI
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: conversation,
            temperature: 0.7,
        });

        const responseContent = completion.choices[0]?.message?.content || 'No response';
        const usage = completion.usage;

        console.log('✅ AI Response Received:\n');
        console.log('─'.repeat(50));
        console.log(responseContent);
        console.log('─'.repeat(50));
        console.log(`\n📊 Token Usage:`);
        console.log(`   Prompt tokens: ${usage?.prompt_tokens || 0}`);
        console.log(`   Completion tokens: ${usage?.completion_tokens || 0}`);
        console.log(`   Total tokens: ${usage?.total_tokens || 0}`);

    } catch (error) {
        console.error('\n❌ Error testing AI:', error);
        if (error instanceof Error) {
            console.error('   Message:', error.message);
        }
    } finally {
        await prisma.$disconnect();
    }
}

testAI();
