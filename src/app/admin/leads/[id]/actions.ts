'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { generateInstallationInvoice, generateFirstMonthInvoice, previewInstallationInvoice, previewFirstMonthInvoice } from '@/lib/invoice-generator';
import { calculateTrialEndDate, calculateNextBillingDate } from '@/lib/invoice-utils';
import { addOneMonth } from '@/lib/date-utils';

export async function assignPaymentFlow(userId: string, paymentFlowId: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { assignedPaymentFlowId: paymentFlowId },
        });

        revalidatePath(`/admin/leads/${userId}`);
        revalidatePath('/admin/leads');

        return { success: true };
    } catch (error) {
        console.error('Assign payment flow error:', error);
        return { success: false, error: 'Gagal menyimpan payment flow' };
    }
}

export async function generateInstallationInvoiceForGate(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { assignedPaymentFlow: true },
        });

        if (!user || !user.assignedPaymentFlow) {
            return { success: false, error: 'Payment flow tidak ditemukan' };
        }

        const flow = user.assignedPaymentFlow;

        if (!flow.requiresInstallationPayment || flow.freeInstallation) {
            return { success: false, error: 'Payment flow tidak memerlukan pembayaran instalasi' };
        }

        // Generate invoice with promo code if user registered with one
        const invoice = await generateInstallationInvoice(userId, flow.id, user.registeredPromoCode || undefined);

        if (!invoice) {
            return { success: false, error: 'Gagal generate invoice' };
        }

        // Mark as payment gate
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: { isPaymentGate: true },
        });

        // Update user status
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'LEAD_PAYMENT_PENDING' },
        });

        revalidatePath(`/admin/leads/${userId}`);

        return {
            success: true,
            invoice: {
                ...invoice,
                amount: Number(invoice.amount), // Convert Decimal to number
                subtotal: invoice.subtotal ? Number(invoice.subtotal) : null,
                taxAmount: invoice.taxAmount ? Number(invoice.taxAmount) : null,
                feeAmount: invoice.feeAmount ? Number(invoice.feeAmount) : null,
            }
        };
    } catch (error) {
        console.error('Generate installation invoice error:', error);
        return { success: false, error: 'Gagal generate invoice' };
    }
}

export async function generateFirstMonthInvoiceForGate(userId: string, promoCode?: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { assignedPaymentFlow: true },
        });

        if (!user || !user.assignedPaymentFlow) {
            return { success: false, error: 'Payment flow tidak ditemukan' };
        }

        const flow = user.assignedPaymentFlow;

        if (!flow.requiresFirstMonthPayment || !flow.firstMonthPaymentAfterInstall) {
            return { success: false, error: 'Payment flow tidak memerlukan pembayaran bulan pertama' };
        }

        // Generate invoice
        console.log('[generateFirstMonthInvoiceForGate] Generating with promoCode:', promoCode, 'User registered:', user.registeredPromoCode);
        const invoice = await generateFirstMonthInvoice(userId, flow.id, promoCode || user.registeredPromoCode || undefined);

        if (!invoice) {
            return { success: false, error: 'Gagal generate invoice' };
        }

        // Mark as payment gate
        await prisma.invoice.update({
            where: { id: invoice.id },
            data: { isPaymentGate: true },
        });

        // Update user status
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'INSTALLED_PAYMENT_PENDING' },
        });

        revalidatePath(`/admin/leads/${userId}`);

        return {
            success: true,
            invoice: {
                ...invoice,
                amount: Number(invoice.amount), // Convert Decimal to number
                subtotal: invoice.subtotal ? Number(invoice.subtotal) : null,
                taxAmount: invoice.taxAmount ? Number(invoice.taxAmount) : null,
                feeAmount: invoice.feeAmount ? Number(invoice.feeAmount) : null,
            }
        };
    } catch (error) {
        console.error('Generate first month invoice error:', error);
        return { success: false, error: 'Gagal generate invoice' };
    }
}

import { activateSubscription } from '@/lib/subscription';

// ... (existing imports)

// ...

export async function markInvoiceAsPaid(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                user: {
                    include: {
                        subscription: true
                    }
                }
            },
        });

        if (!invoice) {
            return { success: false, error: 'Invoice tidak ditemukan' };
        }

        // Update invoice status
        const paidAt = new Date();
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
            const { cancelPendingReminders } = await import('@/lib/reminder-scheduler');
            await cancelPendingReminders(invoiceId);
        } catch (error) {
            console.error(`[markInvoiceAsPaid] Error cancelling reminders for invoice ${invoiceId}:`, error);
            // Don't fail if reminder cancellation fails
        }

        // Update user status based on gate type
        if (invoice.category === 'INSTALLATION_FEE') {
            await prisma.user.update({
                where: { id: invoice.userId },
                data: { status: 'READY_TO_INSTALL' }, // Unlock scheduling
            });
        } else if (invoice.category === 'FIRST_MONTH' ||
            invoice.category === 'PREPAID_3_MONTHS' ||
            invoice.category === 'PREPAID_6_MONTHS' ||
            invoice.category === 'PREPAID_12_MONTHS') {

            // Auto-activate subscription if it's the first payment
            // We check if the user is in a pending state
            if (invoice.user.status === 'INSTALLED_PAYMENT_PENDING' || invoice.user.status === 'INSTALLED') {
                console.log('[markInvoiceAsPaid] Auto-activating subscription for user:', invoice.userId);

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
                const paymentDate = paidAt; // paidAt dari markInvoiceAsPaid

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

                console.log(`[markInvoiceAsPaid] Updated nextBillingDate for REGULAR_MONTHLY invoice`);
                console.log(`[markInvoiceAsPaid]   - Invoice dueDate: ${dueDate.toISOString()}`);
                console.log(`[markInvoiceAsPaid]   - Payment date: ${paymentDate.toISOString()}`);
                console.log(`[markInvoiceAsPaid]   - Base date used: ${baseDate.toISOString()}`);
                console.log(`[markInvoiceAsPaid]   - New nextBillingDate: ${newNextBillingDate.toISOString()}`);
            }
        }

        revalidatePath(`/admin/leads/${invoice.userId}`);

        return { success: true };
    } catch (error) {
        console.error('Mark invoice as paid error:', error);
        return { success: false, error: 'Gagal update status invoice' };
    }
}

// ...

export async function activateCustomer(
    userId: string,
    paymentFlowId: string,
    packageId: string,
    trialDays?: number,
    promoCode?: string
) {
    try {
        // Use shared activation logic
        const result = await activateSubscription(userId);
        if (!result.success) {
            return result;
        }

        // Generate invoices based on payment flow (only if needed)
        // Since activateSubscription is now shared, we need to check if we still need to generate invoices.
        // If this was called manually, we might need to generate them.

        const paymentFlow = await prisma.paymentFlow.findUnique({ where: { id: paymentFlowId } });
        if (paymentFlow) {
            // 1. Installation invoice (if required and not free)
            if (paymentFlow.requiresInstallationPayment && !paymentFlow.freeInstallation) {
                // Check if already exists/paid? generateInstallationInvoice handles creation.
                // But we should be careful not to duplicate if already paid.
                // For now, let's assume manual activation implies we want to ensure invoices exist.
                await generateInstallationInvoice(userId, paymentFlowId, promoCode);
            }

            // 2. First month invoice (if required and after install)
            if (paymentFlow.requiresFirstMonthPayment && paymentFlow.firstMonthPaymentAfterInstall) {
                await generateFirstMonthInvoice(userId, paymentFlowId, promoCode);
            }
        }

        revalidatePath(`/admin/leads/${userId}`);
        revalidatePath('/admin/leads');
        revalidatePath('/admin/customers');

        return { success: true };
    } catch (error) {
        console.error('Activation error:', error);
        return { success: false, error: 'Gagal mengaktifkan pelanggan' };
    }
}

export async function resetPaymentFlow(userId: string) {
    try {
        // Check if any payment gate invoice exists
        const invoice = await prisma.invoice.findFirst({
            where: {
                userId,
                isPaymentGate: true,
            },
        });

        if (invoice) {
            return { success: false, error: 'Tidak bisa mengubah payment flow karena invoice sudah dibuat' };
        }

        await prisma.user.update({
            where: { id: userId },
            data: {
                assignedPaymentFlowId: null,
                status: 'LEAD'
            },
        });

        revalidatePath(`/admin/leads/${userId}`);
        return { success: true };
    } catch (error) {
        console.error('Reset payment flow error:', error);
        return { success: false, error: 'Gagal reset payment flow' };
    }
}


export async function scheduleInstallation(userId: string, date: string, technicianId: string) {
    try {
        const scheduledDate = new Date(date);

        // Get user data for notification
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                name: true,
                phone: true,
                address: true,
            }
        });

        // Upsert installation record
        const installation = await prisma.installation.upsert({
            where: { userId },
            create: {
                userId,
                scheduledDate,
                technicianUserId: technicianId,
                status: 'PENDING',
            },
            update: {
                scheduledDate,
                technicianUserId: technicianId,
                status: 'PENDING',
            },
            include: {
                technicianUser: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    }
                }
            }
        });

        // Update user status to PENDING_INSTALL
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'PENDING_INSTALL' },
        });

        // Send notification to technician if assigned
        if (technicianId && installation.technicianUser && user) {
            const { sendTaskAssignmentNotification } = await import('@/lib/technician-notification');
            await sendTaskAssignmentNotification(technicianId, {
                id: installation.id,
                type: 'INSTALLATION',
                scheduledDate,
                customer: {
                    name: user.name,
                    phone: user.phone,
                    address: user.address || undefined,
                },
                priority: installation.priority || 'NORMAL',
                taskType: installation.taskType,
                locationNotes: installation.locationNotes || undefined,
            }).catch(err => {
                console.error('Failed to send installation notification:', err);
                // Don't fail the request if notification fails
            });
        }

        revalidatePath(`/admin/leads/${userId}`);
        revalidatePath('/admin/leads');

        return { success: true };
    } catch (error) {
        console.error('Schedule error:', error);
        return { success: false, error: 'Terjadi kesalahan server' };
    }
}



export async function completeInstallation(userId: string) {
    try {
        // Update installation status
        await prisma.installation.update({
            where: { userId },
            data: {
                status: 'COMPLETED',
                completedDate: new Date(),
            },
        });

        // Update user status to INSTALLED
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'INSTALLED' },
        });

        revalidatePath(`/admin/leads/${userId}`);
        revalidatePath('/admin/leads');

        return { success: true };
    } catch (error) {
        console.error('Complete installation error:', error);
        return { success: false, error: 'Gagal menyelesaikan instalasi' };
    }
}

export async function previewInvoice(userId: string, type: 'installation' | 'first-month') {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');
        if (!user.assignedPaymentFlowId) throw new Error('Payment flow not assigned');

        let details;
        if (type === 'installation') {
            details = await previewInstallationInvoice(userId, user.assignedPaymentFlowId, user.registeredPromoCode || undefined);
        } else {
            details = await previewFirstMonthInvoice(userId, user.assignedPaymentFlowId, user.registeredPromoCode || undefined);
        }

        if (!details) {
            return { success: false, error: 'Tidak ada invoice yang perlu dibuat untuk tipe ini' };
        }

        return { success: true, data: JSON.parse(JSON.stringify(details)) };
    } catch (error: any) {
        console.error('Preview invoice error:', error);
        return { success: false, error: error.message || 'Gagal preview invoice' };
    }
}

export async function archiveInvoice(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
        });

        if (!invoice) {
            return { success: false, error: 'Invoice tidak ditemukan' };
        }

        if (invoice.status === 'PAID') {
            return { success: false, error: 'Invoice yang sudah dibayar tidak bisa dibatalkan' };
        }

        // Soft delete invoice
        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                deletedAt: new Date(),
                isPaymentGate: false, // Stop blocking workflow
            },
        });

        // Revert user status if needed
        // If it was blocking workflow, we might need to revert status?
        // Actually, if we archive it, we probably want to let the user generate a new one.
        // The status (e.g. LEAD_PAYMENT_PENDING) might be fine to stay, or we can revert to LEAD.
        // Let's revert to safe previous state based on category.

        if (invoice.category === 'INSTALLATION_FEE') {
            await prisma.user.update({
                where: { id: invoice.userId },
                data: { status: 'LEAD' },
            });
        } else if (invoice.category === 'FIRST_MONTH') {
            // If we cancel first month invoice, we go back to INSTALLED (waiting for activation/payment)
            // But actually INSTALLED_PAYMENT_PENDING is fine, just that the gate is now clear?
            // No, if gate is clear, workflow might think it's done?
            // Wait, checkPaymentGateStatus checks for isPaymentGate=true.
            // If we set isPaymentGate=false, checkPaymentGateStatus will return hasInvoice=false.
            // So the UI will show "Generate Invoice" button again.
            // But the user status might still be ..._PAYMENT_PENDING.
            // It's cleaner to revert status.

            await prisma.user.update({
                where: { id: invoice.userId },
                data: { status: 'INSTALLED' },
            });
        }

        revalidatePath(`/admin/leads/${invoice.userId}`);
        return { success: true };
    } catch (error) {
        console.error('Archive invoice error:', error);
        return { success: false, error: 'Gagal membatalkan invoice' };
    }
}
