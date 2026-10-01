import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateInvoice } from '@/lib/invoice-generator';
import { schedulePaymentReminders } from '@/lib/reminder-scheduler';

/**
 * Endpoint untuk generate invoice masa transisi
 * Generate invoice untuk subscription yang nextBillingDate sudah lewat atau akan lewat dalam < 5 hari
 * dan belum memiliki invoice untuk billing cycle tersebut
 */
export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Cari subscription yang:
        // 1. nextBillingDate <= today + 4 hari (kurang dari 5 hari, untuk masa transisi)
        // 2. Status ACTIVE
        // 3. Bukan trial atau prepaid aktif
        const transitionDateEnd = new Date(today);
        transitionDateEnd.setDate(transitionDateEnd.getDate() + 4); // H-4 (kurang dari 5 hari)
        transitionDateEnd.setHours(23, 59, 59, 999);

        console.log(`[Transition Invoices] Looking for subscriptions with nextBillingDate <= ${transitionDateEnd.toISOString()}`);

        const transitionSubscriptions = await prisma.subscription.findMany({
            where: {
                nextBillingDate: {
                    lte: transitionDateEnd, // <= today + 4 hari
                },
                user: { status: 'ACTIVE' },
                isTrialActive: false,
                isPrepaidActive: false,
            },
            include: {
                user: true,
            },
            orderBy: {
                nextBillingDate: 'asc', // Process yang paling urgent dulu
            },
        });

        console.log(`[Transition Invoices] Found ${transitionSubscriptions.length} subscriptions that need invoice generation`);

        let generatedCount = 0;
        let skippedCount = 0;
        const results: Array<{
            subscriptionId: string;
            userId: string;
            userName: string;
            nextBillingDate: string;
            status: 'generated' | 'skipped';
            reason?: string;
            invoiceId?: string;
            invoiceNumber?: string;
        }> = [];

        for (const sub of transitionSubscriptions) {
            if (!sub.nextBillingDate) {
                console.log(`[Transition Invoices] Subscription ${sub.id} has no nextBillingDate, skipping`);
                skippedCount++;
                results.push({
                    subscriptionId: sub.id,
                    userId: sub.userId,
                    userName: sub.user.name,
                    nextBillingDate: 'N/A',
                    status: 'skipped',
                    reason: 'No nextBillingDate',
                });
                continue;
            }

            // Check if invoice already exists for this billing cycle
            const existingInvoice = await prisma.invoice.findFirst({
                where: {
                    userId: sub.userId,
                    category: 'REGULAR_MONTHLY',
                    status: { in: ['UNPAID', 'OVERDUE', 'PAID'] },
                    dueDate: {
                        // Check dalam rentang ±1 hari dari nextBillingDate
                        gte: new Date(sub.nextBillingDate.getTime() - 24 * 60 * 60 * 1000),
                        lte: new Date(sub.nextBillingDate.getTime() + 24 * 60 * 60 * 1000),
                    },
                    deletedAt: null,
                },
                orderBy: { createdAt: 'desc' },
            });

            if (existingInvoice) {
                console.log(`[Transition Invoices] Invoice already exists for subscription ${sub.id}`);
                console.log(`[Transition Invoices]   - User: ${sub.user.name} (${sub.userId})`);
                console.log(`[Transition Invoices]   - nextBillingDate: ${sub.nextBillingDate.toISOString()}`);
                console.log(`[Transition Invoices]   - Existing invoice: ${existingInvoice.invoiceNumber || existingInvoice.id}`);
                console.log(`[Transition Invoices]   - Invoice status: ${existingInvoice.status}`);
                skippedCount++;
                results.push({
                    subscriptionId: sub.id,
                    userId: sub.userId,
                    userName: sub.user.name,
                    nextBillingDate: sub.nextBillingDate.toISOString(),
                    status: 'skipped',
                    reason: `Invoice already exists (${existingInvoice.invoiceNumber || existingInvoice.id}, status: ${existingInvoice.status})`,
                });
                continue;
            }

            try {
                console.log(`[Transition Invoices] Generating invoice for subscription ${sub.id}`);
                console.log(`[Transition Invoices]   - User: ${sub.user.name} (${sub.userId})`);
                console.log(`[Transition Invoices]   - nextBillingDate: ${sub.nextBillingDate.toISOString()}`);
                console.log(`[Transition Invoices]   - Price: ${sub.price}`);

                // Generate invoice dengan dueDate = nextBillingDate
                const invoice = await generateInvoice({
                    userId: sub.userId,
                    type: 'MONTHLY',
                    category: 'REGULAR_MONTHLY',
                    amount: Number(sub.price),
                    dueDate: sub.nextBillingDate,
                });

                // Schedule payment reminders (akan otomatis di-schedule oleh generateInvoice, tapi kita pastikan)
                try {
                    await schedulePaymentReminders(invoice.id, sub.nextBillingDate);
                    console.log(`[Transition Invoices] ✅ Payment reminders scheduled for invoice ${invoice.invoiceNumber}`);
                } catch (reminderError) {
                    console.error(`[Transition Invoices] ⚠️ Error scheduling reminders:`, reminderError);
                    // Continue even if reminder scheduling fails
                }

                // Update nextBillingDate setelah invoice dibuat
                const newNextBillingDate = new Date(today);
                newNextBillingDate.setDate(newNextBillingDate.getDate() + sub.billingCycle);

                await prisma.subscription.update({
                    where: { id: sub.id },
                    data: {
                        nextBillingDate: newNextBillingDate,
                    },
                });

                console.log(`[Transition Invoices] ✅ Invoice generated successfully`);
                console.log(`[Transition Invoices]   - Invoice ID: ${invoice.id}`);
                console.log(`[Transition Invoices]   - Invoice Number: ${invoice.invoiceNumber || 'N/A'}`);
                console.log(`[Transition Invoices]   - Invoice dueDate: ${invoice.dueDate.toISOString()}`);
                console.log(`[Transition Invoices]   - Next billing date updated to: ${newNextBillingDate.toISOString()}`);

                generatedCount++;
                results.push({
                    subscriptionId: sub.id,
                    userId: sub.userId,
                    userName: sub.user.name,
                    nextBillingDate: sub.nextBillingDate.toISOString(),
                    status: 'generated',
                    invoiceId: invoice.id,
                    invoiceNumber: invoice.invoiceNumber || undefined,
                });
            } catch (error) {
                console.error(`[Transition Invoices] ❌ Error generating invoice for subscription ${sub.id}:`, error);
                results.push({
                    subscriptionId: sub.id,
                    userId: sub.userId,
                    userName: sub.user.name,
                    nextBillingDate: sub.nextBillingDate.toISOString(),
                    status: 'skipped',
                    reason: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                });
            }
        }

        return NextResponse.json({
            message: 'Transition invoice generation completed',
            summary: {
                totalFound: transitionSubscriptions.length,
                generated: generatedCount,
                skipped: skippedCount,
            },
            results,
        });
    } catch (error) {
        console.error('[Transition Invoices] Cron Error:', error);
        return NextResponse.json(
            { 
                error: 'Internal Server Error',
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}

