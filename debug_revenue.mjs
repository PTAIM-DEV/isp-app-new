
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    console.log('Checking Invoices...');

    // Check all PAID invoices
    const paidInvoices = await prisma.invoice.findMany({
        where: { status: 'PAID' },
        take: 5,
        orderBy: { paidAt: 'desc' }
    });
    console.log('Sample Paid Invoices:', paidInvoices);

    const now = new Date();
    // Logic from ai-service.ts for 'last_month'
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    console.log('Querying for range:', startOfLastMonth, 'to', endOfLastMonth);

    const result = await prisma.invoice.aggregate({
        where: {
            status: 'PAID',
            paidAt: {
                gte: startOfLastMonth,
                lte: endOfLastMonth
            }
        },
        _sum: { amount: true },
        _count: { id: true }
    });

    console.log('Aggregate Result:', result);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
