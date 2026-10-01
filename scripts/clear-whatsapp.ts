import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearWhatsAppData() {
    try {
        // Delete all WhatsApp data
        await prisma.whatsAppMessage.deleteMany({});
        console.log('✓ Deleted all WhatsApp messages');

        await prisma.whatsAppChat.deleteMany({});
        console.log('✓ Deleted all WhatsApp chats');

        await prisma.whatsAppOutgoing.deleteMany({});
        console.log('✓ Deleted all outgoing messages');

        // Reset status
        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_status' },
            update: { value: 'DISCONNECTED' },
            create: { key: 'whatsapp_status', value: 'DISCONNECTED' }
        });

        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_qr' },
            update: { value: '' },
            create: { key: 'whatsapp_qr', value: '' }
        });

        console.log('✓ Reset WhatsApp status');
        console.log('\n✅ WhatsApp data cleared successfully!');
        console.log('You can now start fresh by running the worker again.');
    } catch (error) {
        console.error('Error clearing WhatsApp data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

clearWhatsAppData();
