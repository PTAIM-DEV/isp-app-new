import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { activateSubscription } from '@/lib/subscription';
import { cancelPendingReminders } from '@/lib/reminder-scheduler';
import { addOneMonth } from '@/lib/date-utils';

export async function POST(request: Request) {
    try {
        const callbackToken = request.headers.get('x-callback-token');
        const xenditCallbackToken = process.env.XENDIT_CALLBACK_TOKEN;

        // Optional: Verify callback token if set in env
        if (xenditCallbackToken && callbackToken !== xenditCallbackToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();

        // We only care about invoice paid events
        // Xendit invoice callback status: 'PAID' or 'EXPIRED'
        if (body.status !== 'PAID') {
            return NextResponse.json({ message: 'Ignored status' }, { status: 200 });
        }

        const xenditId = body.id;
        const paidAt = new Date(body.paid_at || new Date());

        console.log(`[Xendit Webhook] Processing payment for invoice: ${xenditId}`);

        // Find invoice
        const invoice = await prisma.invoice.findUnique({
            where: { xenditId },
            include: {
                user: {
                    include: {
                        subscription: true
                    }
                }
            }
        });

        if (!invoice) {
            console.warn(`[Xendit Webhook] Invoice not found for xenditId: ${xenditId}. Saving transaction as orphan.`);
        } else if (invoice.status === 'PAID') {
            console.log(`[Xendit Webhook] Invoice ${invoice.invoiceNumber} already paid`);
            return NextResponse.json({ message: 'Already paid' }, { status: 200 });
        }

        // Create Payment Transaction Record (Always save this)
        await prisma.paymentTransaction.create({
            data: {
                xenditId: body.id,
                externalId: body.external_id,
                amount: body.amount,
                status: body.status,
                paymentMethod: body.payment_method,
                paymentChannel: body.payment_channel,
                paidAt: paidAt,
                rawResponse: JSON.stringify(body),
                invoiceId: invoice?.id, // Optional
                userId: invoice?.userId, // Optional
            }
        });

        // If invoice exists, update it and trigger business logic
        if (invoice) {
            // Update invoice status
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'PAID',
                    paidAt: paidAt,
                    gateUnlockedAt: new Date(),
                },
            });

            // Cancel pending payment reminders
            try {
                await cancelPendingReminders(invoice.id);
            } catch (error) {
                console.error(`[Xendit Webhook] Error cancelling reminders for invoice ${invoice.id}:`, error);
                // Don't fail the webhook if reminder cancellation fails
            }

            // Update user status based on invoice category
            // Logic mirrors markInvoiceAsPaid in actions.ts
            if (invoice.category === 'INSTALLATION_FEE') {
                await prisma.user.update({
                    where: { id: invoice.userId },
                    data: { status: 'READY_TO_INSTALL' }, // Unlock scheduling
                });
                console.log(`[Xendit Webhook] Unlocked scheduling for user ${invoice.userId}`);
            } else if (invoice.category === 'FIRST_MONTH' ||
                invoice.category === 'PREPAID_3_MONTHS' ||
                invoice.category === 'PREPAID_6_MONTHS' ||
                invoice.category === 'PREPAID_12_MONTHS') {

                // If it's a first month or prepaid payment for a new install, unlock activation
                // We check if current status is INSTALLED_PAYMENT_PENDING or INSTALLED
                if (invoice.user.status === 'INSTALLED_PAYMENT_PENDING' || invoice.user.status === 'INSTALLED') {
                    console.log(`[Xendit Webhook] Auto-activating subscription for user ${invoice.userId}`);

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

                    console.log(`[Xendit Webhook] Updated nextBillingDate for REGULAR_MONTHLY invoice`);
                    console.log(`[Xendit Webhook]   - Invoice dueDate: ${dueDate.toISOString()}`);
                    console.log(`[Xendit Webhook]   - Payment date: ${paymentDate.toISOString()}`);
                    console.log(`[Xendit Webhook]   - Base date used: ${baseDate.toISOString()}`);
                    console.log(`[Xendit Webhook]   - New nextBillingDate: ${newNextBillingDate.toISOString()}`);
                }

                // Start Notification Logic
                try {
                    // Fetch templates
                    const settings = await prisma.systemSetting.findMany({
                        where: {
                            key: {
                                in: ['whatsapp_payment_success_template', 'whatsapp_sales_payment_success_template']
                            }
                        }
                    });

                    const settingsMap = settings.reduce((acc, curr) => ({
                        ...acc,
                        [curr.key]: curr.value
                    }), {} as Record<string, string>);

                    // Common replacements
                    const formatCurrency = (amount: number) => {
                        return new Intl.NumberFormat('id-ID', {
                            style: 'currency',
                            currency: 'IDR',
                            minimumFractionDigits: 0,
                        }).format(amount);
                    };

                    const formatDate = (date: Date) => {
                        return date.toLocaleDateString('id-ID', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        });
                    };

                    const replacements: Record<string, string> = {
                        '{{customerName}}': invoice.user.name,
                        '{{invoiceNumber}}': invoice.invoiceNumber || '-',
                        '{{amount}}': formatCurrency(Number(invoice.amount)),
                        '{{paymentDate}}': formatDate(paidAt),
                    };

                    // 1. Notify Customer
                    if (invoice.user.phone) {
                        let customerTemplate = settingsMap['whatsapp_payment_success_template'];
                        if (!customerTemplate) {
                            customerTemplate = "Halo {{customerName}}, terima kasih pembayaran invoice {{invoiceNumber}} sebesar {{amount}} telah kami terima pada {{paymentDate}}.";
                        }

                        let message = customerTemplate;
                        for (const [key, value] of Object.entries(replacements)) {
                            message = message.replace(new RegExp(key, 'g'), value);
                        }

                        // Clean Phone
                        let phone = invoice.user.phone.replace(/\D/g, '');
                        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
                        const customerJid = `${phone}@s.whatsapp.net`;

                        /*
                        await prisma.whatsAppOutgoing.create({
                            data: {
                                jid: customerJid,
                                content: message,
                                status: 'PENDING'
                            }
                        });
                        console.log(`[Xendit Webhook] Queued payment success message for customer ${invoice.user.name}`);
                        */
                        console.log(`[Xendit Webhook] Auto-notification DISABLED for customer ${invoice.user.name}`);

                        // 2. Notify Sales (if assigned)
                        const sales = await prisma.user.findFirst({
                            where: {
                                role: 'SALES' as const,
                                salesCustomers: { some: { id: invoice.userId } }
                            }
                        });

                        if (sales && sales.phone) {
                            let salesTemplate = settingsMap['whatsapp_sales_payment_success_template'];
                            if (!salesTemplate) {
                                salesTemplate = "Halo {{salesName}}, pelanggan Anda {{customerName}} baru saja melakukan pembayaran invoice {{invoiceNumber}} sebesar {{amount}}.";
                            }

                            replacements['{{salesName}}'] = sales.name;

                            let salesMessage = salesTemplate;
                            for (const [key, value] of Object.entries(replacements)) {
                                salesMessage = salesMessage.replace(new RegExp(key, 'g'), value);
                            }

                            // Clean Phone
                            let salesPhone = sales.phone.replace(/\D/g, '');
                            if (salesPhone.startsWith('0')) salesPhone = '62' + salesPhone.substring(1);
                            const salesJid = `${salesPhone}@s.whatsapp.net`;

                            // Add 1 minute delay
                            const scheduledAt = new Date(Date.now() + 60 * 1000);

                            /*
                            await prisma.whatsAppOutgoing.create({
                                data: {
                                    jid: salesJid,
                                    content: salesMessage,
                                    status: 'PENDING',
                                    scheduledAt: scheduledAt
                                }
                            });
                            console.log(`[Xendit Webhook] Queued payment notification for sales ${sales.name} (scheduled at ${scheduledAt.toISOString()})`);
                            */
                            console.log(`[Xendit Webhook] Auto-notification DISABLED for sales ${sales.name}`);
                        }
                    }
                } catch (notifyError) {
                    console.error('[Xendit Webhook] Error sending notifications:', notifyError);
                    // Don't block the webhook response
                }
                // End Notification Logic
            }

            // Revalidate paths to update UI
            revalidatePath(`/admin/leads/${invoice.userId}`);
            revalidatePath('/admin/leads');
            revalidatePath('/admin/billing');
        }

        // Revalidate billing page to show new transaction (even if orphan)
        revalidatePath('/admin/billing');

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[Xendit Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
