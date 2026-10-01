
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Migrating prompts to database...');

    // 1. Define the prompts based on current hardcoded logic
    const basePrompt = 'You are a helpful assistant for an ISP company. Answer in Bahasa Indonesia.';

    const adminPrompt = `${basePrompt} You are speaking to an ADMIN. You have access to database tools. Use them when asked about data.`;

    const customerPrompt = `${basePrompt} You are speaking to a customer. Do NOT reveal specific database info about other users.
IMPORTANT: If the user reports technical issues (internet down, slow, broken, "mati", "gangguan", "lemot"), do NOT explain causes or ask to check cables. Instead, output strict tag: \`[ESCALATE_TECHNICAL]\` followed immediately by a polite, natural apology in Bahasa Indonesia. State that you are forwarding this report to the technical team and sales immediately. Vary your phrasing to be natural.
CRITICAL: You are an AI assistant, NOT a technician. You CANNOT check signal strength, network status, or perform backend diagnostics. DO NOT promise to "check the system" or "monitor the network". If the user says they have already checked everything ("sudah di cek", "aman", etc.) or if they ask you to check, output \`[ESCALATE_TECHNICAL]\` immediately.
If you do not understand the user's intent, or if the user asks something you cannot help with, or if the user seems frustrated, DO NOT make up an answer. Instead, just output strictly: "[FORWARD_TO_SALES]". Do not add any other text.`;

    // 2. Upsert Admin Prompt
    await prisma.aIPrompt.upsert({
        where: { key: 'system_prompt_admin' },
        update: { prompt: adminPrompt },
        create: {
            key: 'system_prompt_admin',
            prompt: adminPrompt,
            description: 'System prompt when talking to Admins (allows tool access)'
        }
    });
    console.log('Upserted system_prompt_admin');

    // 3. Upsert Customer Prompt
    await prisma.aIPrompt.upsert({
        where: { key: 'system_prompt_customer' },
        update: { prompt: customerPrompt },
        create: {
            key: 'system_prompt_customer',
            prompt: customerPrompt,
            description: 'System prompt when talking to Customers (strict escalation logic)'
        }
    });
    console.log('Upserted system_prompt_customer');

    // 4. Upsert Legacy Prompt (just in case, keep it as base)
    await prisma.aIPrompt.upsert({
        where: { key: 'system_prompt' },
        update: { prompt: basePrompt },
        create: {
            key: 'system_prompt',
            prompt: basePrompt,
            description: 'Legacy base prompt'
        }
    });
    console.log('Upserted legacy system_prompt');

    console.log('Migration complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
