import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding WhatsApp Templates...');

    const templates = [
        {
            name: 'WELCOME',
            content: 'Halo kak {name}, selamat datang di layanan internet kami! 🎉 Terima kasih telah memilih kami sebagai partner konektivitas Anda. Jika ada kendala, jangan ragu untuk hubungi kami di sini ya. 🙏'
        },
        {
            name: 'WELCOME',
            content: 'Selamat bergabung kak {name}! 🚀 Layanan internet Anda sudah aktif. Semoga pengalaman internetan Anda lancar dan menyenangkan. Hubungi kami jika butuh bantuan! 😊'
        },
        {
            name: 'WELCOME',
            content: 'Hai {name}, terima kasih sudah berlangganan! ✨ Kami siap membantu kebutuhan internet Anda. Simpan nomor ini untuk layanan support ya. Happy surfing! 🌐'
        }
    ];

    for (const t of templates) {
        await prisma.whatsAppTemplate.create({
            data: t
        });
    }

    // Set default rate limit settings if not exist
    await prisma.systemSetting.upsert({
        where: { key: 'whatsapp_min_interval' },
        create: { key: 'whatsapp_min_interval', value: '5000' }, // 5s
        update: {},
    });

    await prisma.systemSetting.upsert({
        where: { key: 'whatsapp_random_interval_max' },
        create: { key: 'whatsapp_random_interval_max', value: '5000' }, // +5s random
        update: {},
    });

    console.log('Seeding completed!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
