import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14);
    const backupTableName = `User_Backup_${timestamp}`;

    console.log(`Creating backup table: ${backupTableName}...`);

    try {
        // Check if User table has data
        const count = await prisma.user.count();
        console.log(`Current User count: ${count}`);

        if (count === 0) {
            console.log('User table is empty. No backup needed.');
            return;
        }

        // Execute raw SQL to copy table
        // PostgreSQL syntax
        await prisma.$executeRawUnsafe(`CREATE TABLE "${backupTableName}" AS TABLE "User";`);

        console.log(`✅ Backup success! Table "${backupTableName}" created with ${count} records.`);
    } catch (error) {
        console.error('❌ Backup failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
