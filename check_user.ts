
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const phoneInput = '6281210008571';
    const phones = [
        phoneInput,
        phoneInput.replace(/^62/, '0'), // 0812...
        phoneInput.replace(/^0/, '62'), // 62812...
        phoneInput.replace(/@s\.whatsapp\.net$/, '')
    ];

    console.log('Checking phones:', phones);

    const user = await prisma.user.findFirst({
        where: {
            phone: { in: phones }
        }
    });

    console.log('User found:', user);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
