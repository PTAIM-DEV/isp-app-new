
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Checking SystemSettings...');
    const settings = await prisma.systemSetting.findMany({
        where: { key: 'openai_api_key' }
    });
    console.log('Result:', settings);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
