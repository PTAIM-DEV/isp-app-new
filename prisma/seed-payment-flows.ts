import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding PaymentFlow data...');

    // 1. Standard Flow - Bayar instalasi dulu, baru bisa jadwalkan instalasi
    const standardFlow = await prisma.paymentFlow.upsert({
        where: { id: 'standard-flow' },
        update: {},
        create: {
            id: 'standard-flow',
            name: 'Standard Flow',
            description: 'Bayar instalasi dulu, baru bisa jadwalkan instalasi. Setelah aktivasi, tagih bulan pertama.',
            requiresInstallationPayment: true,
            installationFeeAmount: 500000, // Rp 500.000
            freeInstallation: false,
            requiresFirstMonthPayment: true,
            firstMonthPaymentAfterInstall: true,
            supportsTrial: false,
            isActive: true,
        },
    });
    console.log('✅ Created Standard Flow');

    // 2. Free Installation Flow - Gratis instalasi, bayar bulan pertama setelah instalasi
    const freeInstallFlow = await prisma.paymentFlow.upsert({
        where: { id: 'free-install-flow' },
        update: {},
        create: {
            id: 'free-install-flow',
            name: 'Free Installation',
            description: 'Gratis instalasi. Bayar bulan pertama setelah instalasi selesai.',
            requiresInstallationPayment: false,
            freeInstallation: true,
            requiresFirstMonthPayment: true,
            firstMonthPaymentAfterInstall: true,
            supportsTrial: true,
            trialDays: 3,
            isActive: true,
        },
    });
    console.log('✅ Created Free Installation Flow');

    // 3. Prepaid Flow - Bayar sekaligus dengan bonus bulan gratis
    const prepaidFlow = await prisma.paymentFlow.upsert({
        where: { id: 'prepaid-flow' },
        update: {},
        create: {
            id: 'prepaid-flow',
            name: 'Prepaid Flow',
            description: 'Bayar sekaligus 3/6/12 bulan dengan bonus bulan gratis. Bonus diberikan setelah prepaid habis.',
            requiresInstallationPayment: false,
            freeInstallation: true,
            requiresFirstMonthPayment: false, // Tidak perlu bayar bulan pertama karena sudah prepaid
            firstMonthPaymentAfterInstall: false,
            supportsTrial: true,
            trialDays: 3,
            isActive: true,
        },
    });
    console.log('✅ Created Prepaid Flow');

    // 4. Set default invoice format
    await prisma.systemSetting.upsert({
        where: { key: 'INVOICE_NUMBER_FORMAT' },
        update: {},
        create: {
            key: 'INVOICE_NUMBER_FORMAT',
            value: 'INV-{YEAR}-{MONTH}-{SEQ}',
            description: 'Format nomor invoice. Placeholder: {YEAR}, {MONTH}, {DAY}, {SEQ}, {TYPE}',
        },
    });
    console.log('✅ Created Invoice Number Format setting');

    console.log('🎉 Seeding completed!');
}

main()
    .catch((e) => {
        console.error('❌ Error seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });


