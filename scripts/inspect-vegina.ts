
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: {
            OR: [
                { name: { contains: 'VEGINA', mode: 'insensitive' } },
                { name: { contains: 'GARIN', mode: 'insensitive' } },
                { phone: { contains: '8534389' } }
            ]
        },
        include: {
            salesPerson: true
        }
    });

    console.log('Found users:', JSON.stringify(users, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
