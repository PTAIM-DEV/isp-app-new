import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addOneMonth } from '@/lib/date-utils';

/**
 * Fix nextBillingDate untuk semua invoice REGULAR_MONTHLY yang sudah PAID
 * 
 * Endpoint: GET /api/admin/fix-next-billing-dates
 * 
 * Logic:
 * - Cari semua invoice REGULAR_MONTHLY dengan status PAID
 * - Untuk setiap invoice:
 *   - Jika paidAt <= dueDate: nextBillingDate = addOneMonth(dueDate)
 *   - Jika paidAt > dueDate: nextBillingDate = addOneMonth(paidAt)
 * - Update subscription.nextBillingDate
 */
export async function GET() {
    try {
        console.log('[Fix Next Billing Dates] Starting fix process...');

        // Get all PAID REGULAR_MONTHLY invoices
        const paidInvoices = await prisma.invoice.findMany({
            where: {
                category: 'REGULAR_MONTHLY',
                status: 'PAID',
                deletedAt: null,
            },
            include: {
                user: {
                    include: {
                        subscription: true,
                    },
                },
            },
            orderBy: {
                paidAt: 'desc',
            },
        });

        console.log(`[Fix Next Billing Dates] Found ${paidInvoices.length} PAID REGULAR_MONTHLY invoices`);

        const results = {
            total: paidInvoices.length,
            updated: 0,
            skipped: 0,
            errors: [] as Array<{ invoiceId: string; error: string }>,
            details: [] as Array<{
                invoiceId: string;
                invoiceNumber: string | null;
                userId: string;
                userName: string;
                dueDate: string;
                paidAt: string | null;
                oldNextBillingDate: string | null;
                newNextBillingDate: string;
                baseDateUsed: string;
            }>,
        };

        for (const invoice of paidInvoices) {
            try {
                // Skip if no subscription
                if (!invoice.user.subscription) {
                    console.log(`[Fix Next Billing Dates] Skipping invoice ${invoice.id}: No subscription found`);
                    results.skipped++;
                    continue;
                }

                const subscription = invoice.user.subscription;
                const dueDate = new Date(invoice.dueDate);
                const paidAt = invoice.paidAt ? new Date(invoice.paidAt) : null;

                if (!paidAt) {
                    console.log(`[Fix Next Billing Dates] Skipping invoice ${invoice.id}: No paidAt date`);
                    results.skipped++;
                    continue;
                }

                // Determine base date
                // Jika dibayar SEBELUM jatuh tempo: gunakan dueDate
                // Jika dibayar SETELAH jatuh tempo: gunakan paidAt
                const baseDate = paidAt <= dueDate ? dueDate : paidAt;
                const newNextBillingDate = addOneMonth(new Date(baseDate));

                // Get old nextBillingDate for comparison
                const oldNextBillingDate = subscription.nextBillingDate;

                // Update subscription
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        nextBillingDate: newNextBillingDate,
                    },
                });

                results.updated++;
                results.details.push({
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                    userId: invoice.userId,
                    userName: invoice.user.name,
                    dueDate: dueDate.toISOString(),
                    paidAt: paidAt.toISOString(),
                    oldNextBillingDate: oldNextBillingDate?.toISOString() || null,
                    newNextBillingDate: newNextBillingDate.toISOString(),
                    baseDateUsed: baseDate.toISOString(),
                });

                console.log(`[Fix Next Billing Dates] ✅ Updated subscription for invoice ${invoice.invoiceNumber || invoice.id}`);
                console.log(`[Fix Next Billing Dates]   - User: ${invoice.user.name}`);
                console.log(`[Fix Next Billing Dates]   - Due Date: ${dueDate.toISOString()}`);
                console.log(`[Fix Next Billing Dates]   - Paid At: ${paidAt.toISOString()}`);
                console.log(`[Fix Next Billing Dates]   - Base Date Used: ${baseDate.toISOString()}`);
                console.log(`[Fix Next Billing Dates]   - Old Next Billing Date: ${oldNextBillingDate?.toISOString() || 'null'}`);
                console.log(`[Fix Next Billing Dates]   - New Next Billing Date: ${newNextBillingDate.toISOString()}`);
            } catch (error: any) {
                console.error(`[Fix Next Billing Dates] ❌ Error processing invoice ${invoice.id}:`, error);
                results.errors.push({
                    invoiceId: invoice.id,
                    error: error.message || 'Unknown error',
                });
            }
        }

        console.log(`[Fix Next Billing Dates] ✅ Fix process completed`);
        console.log(`[Fix Next Billing Dates]   - Total invoices: ${results.total}`);
        console.log(`[Fix Next Billing Dates]   - Updated: ${results.updated}`);
        console.log(`[Fix Next Billing Dates]   - Skipped: ${results.skipped}`);
        console.log(`[Fix Next Billing Dates]   - Errors: ${results.errors.length}`);

        return NextResponse.json({
            success: true,
            message: `Fixed nextBillingDate for ${results.updated} subscriptions`,
            results,
        });
    } catch (error: any) {
        console.error('[Fix Next Billing Dates] Fatal error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fix next billing dates',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

