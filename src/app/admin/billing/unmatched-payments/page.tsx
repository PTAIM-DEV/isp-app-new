import { prisma } from '@/lib/prisma';
import { UnmatchedPaymentsClient } from './unmatched-payments-client';

export const dynamic = 'force-dynamic';

export default async function UnmatchedPaymentsPage() {
    // Get unmatched payments
    const payments = await prisma.paymentTransaction.findMany({
        where: {
            invoiceId: null,
            status: 'PAID', // Only show paid transactions
        },
        orderBy: {
            createdAt: 'desc',
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                },
            },
        },
    });

    // Convert Decimal to number for client component
    const paymentsForClient = payments.map(payment => ({
        ...payment,
        amount: Number(payment.amount),
    }));

    return <UnmatchedPaymentsClient initialPayments={paymentsForClient} />;
}

