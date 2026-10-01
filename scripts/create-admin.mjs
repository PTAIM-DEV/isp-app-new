
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const phone = process.argv[2] || '6281210008571';

async function main() {
    console.log(`Searching for user with phone: ${phone}...`);

    // Try to find first
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { phone: phone },
                { phone: phone.replace(/^62/, '0') },
                { phone: phone.replace(/^0/, '62') }
            ]
        }
    });

    if (user) {
        console.log(`Found user: ${user.name} (${user.phone}). Promoting to ADMIN...`);
        await prisma.user.update({
            where: { id: user.id },
            data: { role: 'ADMIN' }
        });
        console.log('SUCCESS: User updated to ADMIN.');
    } else {
        console.log('User not found. Creating new ADMIN user...');
        await prisma.user.create({
            data: {
                name: 'Super Admin',
                phone: phone,
                role: 'ADMIN',
                status: 'ACTIVE'
            }
        });
        console.log('SUCCESS: Created new ADMIN user.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
