'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { activateSubscription } from '@/lib/subscription';
import { cancelPendingReminders } from '@/lib/reminder-scheduler';
import { addOneMonth } from '@/lib/date-utils';

/**
 * Get unmatched payment transactions (invoiceId is null)
 */
export async function getUnmatchedPayments() {
    try {
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

        return { success: true, payments };
    } catch (error) {
        console.error('[Unmatched Payments] Error fetching payments:', error);
        return { success: false, error: 'Gagal mengambil data payment' };
    }
}

/**
 * Search invoices by various criteria
 */
export async function searchInvoices(query: string) {
    try {
        if (!query || query.trim().length < 2) {
            return { success: true, invoices: [] };
        }

        const searchTerm = query.trim();

        // Search by invoice number, user name, user phone, user email, or amount
        const invoices = await prisma.invoice.findMany({
            where: {
                OR: [
                    { invoiceNumber: { contains: searchTerm, mode: 'insensitive' } },
                    { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
                    { user: { phone: { contains: searchTerm, mode: 'insensitive' } } },
                    { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
                ],
                status: { in: ['UNPAID', 'OVERDUE'] }, // Only show unpaid invoices
                deletedAt: null, // Exclude soft-deleted
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
            orderBy: {
                createdAt: 'desc',
            },
            take: 20, // Limit results
        });

        // Convert Decimal to number for client component
        const invoicesForClient = invoices.map(invoice => ({
            ...invoice,
            amount: Number(invoice.amount),
        }));

        return { success: true, invoices: invoicesForClient };
    } catch (error) {
        console.error('[Unmatched Payments] Error searching invoices:', error);
        return { success: false, error: 'Gagal mencari invoice' };
    }
}

/**
 * Match payment transaction with invoice
 */
export async function matchPaymentWithInvoice(
    paymentTransactionId: string,
    invoiceId: string
) {
    try {
        // Get payment transaction
        const payment = await prisma.paymentTransaction.findUnique({
            where: { id: paymentTransactionId },
        });

        if (!payment) {
            return { success: false, error: 'Payment transaction tidak ditemukan' };
        }

        if (payment.invoiceId) {
            return { success: false, error: 'Payment transaction sudah di-match dengan invoice lain' };
        }

        // Get invoice
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                user: {
                    include: {
                        subscription: true,
                    },
                },
            },
        });

        if (!invoice) {
            return { success: false, error: 'Invoice tidak ditemukan' };
        }

        if (invoice.status === 'PAID') {
            return { success: false, error: 'Invoice sudah dibayar' };
        }

        // Check amount match (optional warning, but allow anyway)
        const paymentAmount = Number(payment.amount);
        const invoiceAmount = Number(invoice.amount);
        const amountDiff = Math.abs(paymentAmount - invoiceAmount);

        // Update payment transaction with invoice reference
        await prisma.paymentTransaction.update({
            where: { id: paymentTransactionId },
            data: {
                invoiceId: invoiceId,
                userId: invoice.userId,
            },
        });

        // Update invoice status
        const paidAt = payment.paidAt || new Date();
        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: 'PAID',
                paidAt: paidAt,
                gateUnlockedAt: new Date(),
            },
        });

        // Cancel pending payment reminders
        try {
            await cancelPendingReminders(invoiceId);
        } catch (error) {
            console.error(`[Match Payment] Error cancelling reminders for invoice ${invoiceId}:`, error);
            // Don't fail if reminder cancellation fails
        }

        // Update user status based on invoice category
        // Logic mirrors markInvoiceAsPaid in actions.ts
        if (invoice.category === 'INSTALLATION_FEE') {
            await prisma.user.update({
                where: { id: invoice.userId },
                data: { status: 'LEAD' }, // Unlock scheduling
            });
        } else if (
            invoice.category === 'FIRST_MONTH' ||
            invoice.category === 'PREPAID_3_MONTHS' ||
            invoice.category === 'PREPAID_6_MONTHS' ||
            invoice.category === 'PREPAID_12_MONTHS'
        ) {
            // If it's a first month or prepaid payment for a new install, unlock activation
            if (invoice.user.status === 'INSTALLED_PAYMENT_PENDING' || invoice.user.status === 'INSTALLED') {
                // Extract prepaid info
                const prepaidMonths = invoice.prepaidMonths || 0;
                const bonusMonths = invoice.bonusMonths || 0;

                await activateSubscription(invoice.userId, prepaidMonths, bonusMonths);
            } else {
                // Just ensure they are installed if not already active
                if (invoice.user.status !== 'ACTIVE') {
                    await prisma.user.update({
                        where: { id: invoice.userId },
                        data: { status: 'INSTALLED' },
                    });
                }
            }
        } else if (invoice.category === 'REGULAR_MONTHLY') {
            // Update nextBillingDate untuk REGULAR_MONTHLY
            // Jika dibayar SEBELUM jatuh tempo: nextBillingDate = dueDate + 1 bulan (tanggal sama)
            // Jika dibayar SETELAH jatuh tempo: nextBillingDate = paidAt + 1 bulan (tanggal sama)
            // Handle edge cases: 31 Jan → 28/29 Feb, 31 Mar → 30 Apr, dll
            if (invoice.user.subscription) {
                const subscription = invoice.user.subscription;
                const dueDate = new Date(invoice.dueDate);
                const paymentDate = paidAt;
                
                // Gunakan dueDate jika dibayar sebelum atau pada hari jatuh tempo
                // Gunakan paidAt jika dibayar setelah jatuh tempo
                const baseDate = paymentDate <= dueDate ? dueDate : paymentDate;
                
                // Add one month (handles edge cases automatically)
                const newNextBillingDate = addOneMonth(new Date(baseDate));
                
                await prisma.subscription.update({
                    where: { id: subscription.id },
                    data: {
                        nextBillingDate: newNextBillingDate,
                    },
                });
                
                console.log(`[Match Payment] Updated nextBillingDate for REGULAR_MONTHLY invoice`);
                console.log(`[Match Payment]   - Invoice dueDate: ${dueDate.toISOString()}`);
                console.log(`[Match Payment]   - Payment date: ${paymentDate.toISOString()}`);
                console.log(`[Match Payment]   - Base date used: ${baseDate.toISOString()}`);
                console.log(`[Match Payment]   - New nextBillingDate: ${newNextBillingDate.toISOString()}`);
            }
        }

        // Revalidate paths
        revalidatePath('/admin/billing/unmatched-payments');
        revalidatePath(`/admin/leads/${invoice.userId}`);
        revalidatePath('/admin/billing');

        return {
            success: true,
            warning: amountDiff > 1000 ? `Perhatian: Selisih amount Rp ${amountDiff.toLocaleString('id-ID')}` : undefined,
        };
    } catch (error) {
        console.error('[Match Payment] Error:', error);
        return { success: false, error: 'Gagal match payment dengan invoice' };
    }
}

