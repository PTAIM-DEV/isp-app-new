
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Removing Legacy Welcome Message Setting ---');

    const key = 'whatsapp_welcome_message';

    const existing = await prisma.systemSetting.findUnique({
        where: { key }
    });

    if (existing) {
        console.log(`Found legacy setting: ${key}`);
        await prisma.systemSetting.delete({
            where: { key }
        });
        console.log(`✅ Successfully deleted SystemSetting: ${key}`);
    } else {
        console.log(`ℹ️ Setting ${key} not found (already deleted).`);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
