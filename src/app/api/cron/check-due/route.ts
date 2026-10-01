import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toggleBlockUser } from '@/lib/mikrotik';
import { generateInvoice, generateFirstMonthInvoice } from '@/lib/invoice-generator';
import { InvoiceCategory } from '@prisma/client';

export async function GET() {
    try {
        const today = new Date();
        let generatedInvoices = 0;
        let blockedUsers = 0;
        let trialExpired = 0;
        let prepaidExpired = 0;

        // 1. Check for trial expiration -> Generate first month invoice
        const expiredTrials = await prisma.subscription.findMany({
            where: {
                isTrialActive: true,
                trialEndDate: { lte: today },
                user: { status: 'ACTIVE' }
            },
            include: {
                user: true,
                paymentFlow: true
            }
        });

        for (const sub of expiredTrials) {
            if (sub.paymentFlow && sub.paymentFlow.requiresFirstMonthPayment) {
                try {
                    await generateFirstMonthInvoice(sub.userId, sub.paymentFlowId || '');

                    // Update subscription - trial ended
                    await prisma.subscription.update({
                        where: { id: sub.id },
                        data: {
                            isTrialActive: false,
                            // nextBillingDate will be set after payment
                        }
                    });

                    trialExpired++;
                } catch (error) {
                    console.error(`Error generating invoice for expired trial ${sub.id}:`, error);
                }
            }
        }

        // 2. Check for prepaid expiration -> Apply bonus months and generate monthly invoice
        const expiredPrepaids = await prisma.subscription.findMany({
            where: {
                isPrepaidActive: true,
                prepaidValidUntil: { lte: today },
                user: { status: 'ACTIVE' }
            },
            include: {
                user: true,
                paymentFlow: true
            }
        });

        for (const sub of expiredPrepaids) {
            try {
                // Apply bonus months if any
                if (sub.bonusMonthsPending > 0) {
                    const bonusValidUntil = new Date(sub.prepaidValidUntil || today);
                    bonusValidUntil.setMonth(bonusValidUntil.getMonth() + sub.bonusMonthsPending);

                    await prisma.subscription.update({
                        where: { id: sub.id },
                        data: {
                            prepaidCreditMonths: sub.bonusMonthsPending,
                            bonusMonthsPending: 0,
                            prepaidValidUntil: bonusValidUntil,
                            nextBillingDate: bonusValidUntil,
                        }
                    });
                } else {
                    // No bonus, generate monthly invoice
                    if (sub.paymentFlow && sub.paymentFlow.requiresFirstMonthPayment) {
                        await generateInvoice({
                            userId: sub.userId,
                            type: 'MONTHLY',
                            category: 'REGULAR_MONTHLY',
                            amount: Number(sub.price),
                            dueDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
                        });

                        await prisma.subscription.update({
                            where: { id: sub.id },
                            data: {
                                isPrepaidActive: false,
                                prepaidCreditMonths: 0,
                            }
                        });
                    }
                }

                prepaidExpired++;
            } catch (error) {
                console.error(`Error handling expired prepaid ${sub.id}:`, error);
            }
        }

        // 3. Check for subscriptions due for regular monthly billing (H-5 before due date)
        // Generate invoice tepat 5 hari sebelum nextBillingDate
        // Invoice dibuat hari ini dengan dueDate = nextBillingDate (5 hari kemudian)
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);

        // H-5: 5 hari dari sekarang (start of day)
        const h5DateStart = new Date(todayStart);
        h5DateStart.setDate(h5DateStart.getDate() + 5);
        h5DateStart.setHours(0, 0, 0, 0);

        // H-5: 5 hari dari sekarang (end of day)
        const h5DateEnd = new Date(todayStart);
        h5DateEnd.setDate(h5DateEnd.getDate() + 5);
        h5DateEnd.setHours(23, 59, 59, 999);

        console.log(`[Check Due] Looking for subscriptions with nextBillingDate between ${h5DateStart.toISOString()} and ${h5DateEnd.toISOString()}`);

        const dueSubscriptions = await prisma.subscription.findMany({
            where: {
                nextBillingDate: {
                    gte: h5DateStart,  // >= today + 5 days (start of day)
                    lte: h5DateEnd,    // <= today + 5 days (end of day)
                },
                user: { status: 'ACTIVE' },
                isTrialActive: false,
                isPrepaidActive: false,
            },
            include: {
                user: true,
            },
        });

        console.log(`[Check Due] Found ${dueSubscriptions.length} subscriptions with nextBillingDate in H-5 range`);

        for (const sub of dueSubscriptions) {
            // Skip if nextBillingDate is null
            if (!sub.nextBillingDate) {
                console.log(`[Check Due] Subscription ${sub.id} has no nextBillingDate, skipping`);
                continue;
            }

            // ✅ FLAG CHECK: Check if invoice already exists for this billing cycle
            // Invoice dibuat H-5 dengan dueDate = nextBillingDate
            // Jadi kita check apakah sudah ada invoice dengan dueDate yang sesuai dengan nextBillingDate
            const existingInvoice = await prisma.invoice.findFirst({
                where: {
                    userId: sub.userId,
                    category: 'REGULAR_MONTHLY',
                    status: { in: ['UNPAID', 'OVERDUE', 'PAID'] }, // Include PAID to prevent duplicate
                    dueDate: {
                        // Check dalam rentang ±1 hari dari nextBillingDate untuk handle timezone/rounding issues
                        gte: new Date(sub.nextBillingDate.getTime() - 24 * 60 * 60 * 1000), // H-1
                        lte: new Date(sub.nextBillingDate.getTime() + 24 * 60 * 60 * 1000), // H+1
                    },
                    deletedAt: null, // Exclude soft-deleted invoices
                },
                orderBy: { createdAt: 'desc' },
            });

            if (existingInvoice) {
                console.log(`[Check Due] Invoice already exists for subscription ${sub.id} (userId: ${sub.userId})`);
                console.log(`[Check Due]   - nextBillingDate: ${sub.nextBillingDate.toISOString()}`);
                console.log(`[Check Due]   - Existing invoice: ${existingInvoice.invoiceNumber || existingInvoice.id}`);
                console.log(`[Check Due]   - Invoice dueDate: ${existingInvoice.dueDate.toISOString()}`);
                console.log(`[Check Due]   - Invoice status: ${existingInvoice.status}`);
                console.log(`[Check Due] Skipping to prevent duplicate`);
                continue;
            }

            try {
                console.log(`[Check Due] Generating invoice for subscription ${sub.id} (userId: ${sub.userId})`);
                console.log(`[Check Due]   - nextBillingDate: ${sub.nextBillingDate.toISOString()}`);
                console.log(`[Check Due]   - Price: ${sub.price}`);

                // Create invoice with dueDate = nextBillingDate (invoice created H-5, due on nextBillingDate)
                const invoice = await generateInvoice({
                    userId: sub.userId,
                    type: 'MONTHLY',
                    category: 'REGULAR_MONTHLY',
                    amount: Number(sub.price),
                    dueDate: sub.nextBillingDate, // Due date = nextBillingDate
                });

                // Update nextBillingDate setelah invoice dibuat
                const newNextBillingDate = new Date(todayStart);
                newNextBillingDate.setDate(newNextBillingDate.getDate() + sub.billingCycle);

                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: {
                        nextBillingDate: newNextBillingDate,
                    },
                });

                console.log(`[Check Due] ✅ Invoice generated successfully`);
                console.log(`[Check Due]   - Invoice ID: ${invoice.id}`);
                console.log(`[Check Due]   - Invoice Number: ${invoice.invoiceNumber || 'N/A'}`);
                console.log(`[Check Due]   - Invoice dueDate: ${invoice.dueDate.toISOString()}`);
                console.log(`[Check Due]   - Next billing date updated to: ${newNextBillingDate.toISOString()}`);

                generatedInvoices++;
            } catch (error) {
                console.error(`[Check Due] ❌ Error generating invoice for subscription ${sub.id} (userId: ${sub.userId}):`, error);
            }
        }

        // 4. Check for Overdue Invoices -> Block User
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                dueDate: { lt: today },
                status: { in: ['UNPAID', 'OVERDUE'] },
                user: { status: 'ACTIVE' }
            },
            include: { user: true }
        });

        for (const invoice of overdueInvoices) {
            // Check if there is a PAID invoice for the same period (approx same due date)
            // This prevents blocking users who have a duplicate invoice that was paid (e.g. manual + auto)
            const paidInvoice = await prisma.invoice.findFirst({
                where: {
                    userId: invoice.userId,
                    status: 'PAID',
                    dueDate: {
                        // Check within ±12 hours to catch same-day invoices
                        gte: new Date(invoice.dueDate.getTime() - 12 * 60 * 60 * 1000),
                        lte: new Date(invoice.dueDate.getTime() + 12 * 60 * 60 * 1000)
                    }
                }
            });

            if (paidInvoice) {
                console.log(`[Check Due] Skipping block for user ${invoice.userId} - Found matching PAID invoice ${paidInvoice.id} for overdue invoice ${invoice.id}`);

                // Auto-cancel the duplicate overdue invoice
                await prisma.invoice.update({
                    where: { id: invoice.id },
                    data: {
                        status: 'CANCELLED',
                        description: (invoice.description || '') + ' [Auto-cancelled: Duplicate of paid invoice]'
                    }
                });

                continue;
            }

            // Mark invoice as overdue
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: { status: 'OVERDUE' }
            });

            // Soft Block User
            await prisma.user.update({
                where: { id: invoice.userId },
                data: { status: 'BLOCKED' }
            });

            // Trigger Mikrotik Block
            await toggleBlockUser('192.168.x.x', true);
            blockedUsers++;
        }

        return NextResponse.json({
            message: 'Cron job executed',
            generatedInvoices,
            blockedUsers,
            trialExpired,
            prepaidExpired,
        });

    } catch (error) {
        console.error('Cron Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
