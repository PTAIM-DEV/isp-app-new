
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Attempting to drop conflicting index "Technician_email_key"...');
    try {
        // Drop Technician_email_key
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "Technician_email_key"`);
        console.log('✅ Successfully dropped index "Technician_email_key".');

        // Drop User_nik_key
        await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "User_nik_key"`);
        console.log('✅ Successfully dropped index "User_nik_key".');

        console.log('You can now run "npx prisma db push" again.');
    } catch (e) {
        console.error('❌ Error dropping index:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
