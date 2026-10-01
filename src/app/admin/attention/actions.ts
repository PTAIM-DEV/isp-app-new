'use server';

import { prisma } from '@/lib/prisma';
import { sendPaymentReminder } from '@/lib/payment-reminder';
import { revalidatePath } from 'next/cache';
import { toggleBlockUser } from '@/lib/mikrotik';

export type AttentionType = 'OVERDUE_INVOICE' | 'STUCK_ONBOARDING' | 'STUCK_INSTALLATION';

export interface AttentionItem {
    id: string; // User ID or Invoice ID depending on context
    type: AttentionType;
    title: string;
    description: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    date: Date;
    data: any; // Extra data for manual actions
}

export const dynamic = 'force-dynamic';

export async function getAttentionItems(): Promise<AttentionItem[]> {
    console.log('--- DEBUG: Fetching Attention Items ---');
    const items: AttentionItem[] = [];
    const today = new Date();
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // 1. Overdue Invoices (All Overdue)
    // Severity: HIGH
    // Show ALL overdue invoices regardless of how long (even 1 day)
    // Show even if user is BLOCKED (so admin can unblock or follow up)
    const overdueInvoices = await prisma.invoice.findMany({
        where: {
            status: 'OVERDUE',
            deletedAt: null,
            // Removed filters to show all overdue including blocked
        },
        include: {
            user: true,
        },
        take: 50,
    });
    console.log(`--- DEBUG: Found ${overdueInvoices.length} Overdue Invoices ---`);

    for (const inv of overdueInvoices) {
        const isBlocked = inv.user.status === 'BLOCKED';

        // If blocked, severity is lower (already acted upon), but still needs payment
        // If active and overdue, severity is HIGH (needs block/reminder)
        const severity = isBlocked ? 'LOW' : 'HIGH';
        const titlePrefix = isBlocked ? 'Blocked: ' : 'Overdue: ';

        items.push({
            id: inv.id,
            type: 'OVERDUE_INVOICE',
            title: `${titlePrefix}${inv.user.name}`,
            description: `Tagihan ${inv.invoiceNumber || 'N/A'} sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(Number(inv.amount))} jatuh tempo pada ${inv.dueDate.toLocaleDateString('id-ID')}.`,
            severity: severity,
            date: inv.dueDate,
            data: {
                invoiceId: inv.id,
                userId: inv.user.id,
                phone: inv.user.phone,
                email: inv.user.email,
                amount: Number(inv.amount),
                status: inv.user.status,
            },
        });
    }

    // 2. Stuck Onboarding (Registered > 3 days ago, Status LEAD, No Payment)
    // Severity: MEDIUM
    const stuckLeads = await prisma.user.findMany({
        where: {
            role: 'CUSTOMER',
            status: 'LEAD', // Still Lead
            createdAt: {
                lt: threeDaysAgo,
            },
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
    });

    for (const lead of stuckLeads) {
        items.push({
            id: lead.id,
            type: 'STUCK_ONBOARDING',
            title: `Stuck Lead: ${lead.name}`,
            description: `Mendaftar pada ${lead.createdAt.toLocaleDateString('id-ID')} tapi belum melakukan pembayaran/instalasi.`,
            severity: 'MEDIUM',
            date: lead.createdAt,
            data: {
                userId: lead.id,
                phone: lead.phone,
                email: lead.email,
            },
        });
    }

    // 3. Technical Alerts (Paid but not Installed > 3 days)
    // Status: PENDING_INSTALL or READY_TO_INSTALL
    // Severity: MEDIUM
    const stuckInstallations = await prisma.user.findMany({
        where: {
            role: 'CUSTOMER',
            status: { in: ['PENDING_INSTALL', 'READY_TO_INSTALL'] },
            updatedAt: { // Status changed > 3 days ago
                lt: threeDaysAgo,
            },
        },
        include: {
            installation: true
        },
        take: 50,
    });

    for (const user of stuckInstallations) {
        let reason = 'Menunggu instalasi';
        if (user.status === 'READY_TO_INSTALL') reason = 'Siap pasang (sudah bayar)';

        items.push({
            id: user.id,
            type: 'STUCK_INSTALLATION',
            title: `Instalasi Tertunda: ${user.name}`,
            description: `${reason} sejak ${user.updatedAt.toLocaleDateString('id-ID')}.`,
            severity: 'MEDIUM',
            date: user.updatedAt,
            data: {
                userId: user.id,
                phone: user.phone,
                status: user.status,
                installationId: user.installation?.id
            },
        });
    }

    // Sort by severity (HIGH first) then date
    return items.sort((a, b) => {
        if (a.severity === 'HIGH' && b.severity !== 'HIGH') return -1;
        if (a.severity !== 'HIGH' && b.severity === 'HIGH') return 1;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
}

export async function manualBlockUser(userId: string) {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Update DB
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'BLOCKED' },
        });

        // Mikrotik API
        try {
            await toggleBlockUser('0.0.0.0', true);
        } catch (e) {
            console.error('Mikrotik block failed but DB updated', e);
        }

        revalidatePath('/admin/attention');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function manualUnblockUser(userId: string) {
    try {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        // Update DB
        await prisma.user.update({
            where: { id: userId },
            data: { status: 'ACTIVE' },
        });

        // Mikrotik API: Unblock
        try {
            await toggleBlockUser('0.0.0.0', false); // Unblock
        } catch (e) {
            console.error('Mikrotik unblock failed but DB updated', e);
        }

        revalidatePath('/admin/attention');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function sendManualBillingReminder(invoiceId: string) {
    try {
        await sendPaymentReminder(invoiceId, 'MANUAL');
        revalidatePath('/admin/attention');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
