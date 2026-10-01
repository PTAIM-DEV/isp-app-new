import { prisma } from '@/lib/prisma';
import { InvoiceType, InvoiceCategory } from '@prisma/client';

/**
 * Generate invoice number berdasarkan format yang di-setting di SystemSetting
 * Format bisa menggunakan placeholder: {YEAR}, {MONTH}, {DAY}, {SEQ}, {TYPE}
 * Contoh: "INV-{YEAR}-{MONTH}-{SEQ}" → "INV-2024-01-001"
 */
export async function generateInvoiceNumber(type: InvoiceType): Promise<string> {
    const formatSetting = await prisma.systemSetting.findUnique({
        where: { key: 'INVOICE_NUMBER_FORMAT' }
    });

    const defaultFormat = 'INV-{YEAR}-{MONTH}-{SEQ}';
    const format = formatSetting?.value || defaultFormat;

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    // Get sequence number (reset setiap bulan)
    const seqKey = `invoice_seq_${year}_${month}`;
    const seqSetting = await prisma.systemSetting.findUnique({
        where: { key: seqKey }
    });

    let seq = 1;
    if (seqSetting) {
        seq = parseInt(seqSetting.value) + 1;
    }

    // Update sequence
    await prisma.systemSetting.upsert({
        where: { key: seqKey },
        update: { value: String(seq) },
        create: { key: seqKey, value: String(seq), description: `Invoice sequence for ${year}-${month}` }
    });

    // Replace placeholders
    let invoiceNumber = format
        .replace(/{YEAR}/g, String(year))
        .replace(/{MONTH}/g, month)
        .replace(/{DAY}/g, day)
        .replace(/{SEQ}/g, String(seq).padStart(3, '0'))
        .replace(/{TYPE}/g, type.substring(0, 3).toUpperCase());

    return invoiceNumber;
}

/**
 * Calculate prepaid valid until date
 */
export function calculatePrepaidValidUntil(months: number, bonusMonths: number = 0): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + months + bonusMonths);
    return date;
}

/**
 * Calculate trial end date from activation date
 */
export function calculateTrialEndDate(activatedDate: Date, trialDays: number): Date {
    const endDate = new Date(activatedDate);
    endDate.setDate(endDate.getDate() + trialDays);
    return endDate;
}

/**
 * Get invoice description based on type and category
 */
export function getInvoiceDescription(
    type: InvoiceType,
    category: InvoiceCategory,
    months?: number,
    bonusMonths?: number
): string {
    switch (category) {
        case 'INSTALLATION_FEE':
            return 'Biaya Instalasi';
        case 'FIRST_MONTH':
            return 'Tagihan Bulan Pertama';
        case 'REGULAR_MONTHLY':
            return 'Tagihan Bulanan';
        case 'PREPAID_3_MONTHS':
            return `Pembayaran Sekaligus 3 Bulan${bonusMonths ? ` + ${bonusMonths} Bulan Gratis` : ''}`;
        case 'PREPAID_6_MONTHS':
            return `Pembayaran Sekaligus 6 Bulan${bonusMonths ? ` + ${bonusMonths} Bulan Gratis` : ''}`;
        case 'PREPAID_12_MONTHS':
            return `Pembayaran Sekaligus 12 Bulan${bonusMonths ? ` + ${bonusMonths} Bulan Gratis` : ''}`;
        case 'TRIAL_PERIOD':
            return 'Free Trial Period';
        default:
            return 'Tagihan Internet';
    }
}

/**
 * Calculate next billing date based on subscription and payment flow
 * Note: This function is for reference, actual calculation is done in activateCustomer
 */
export function calculateNextBillingDate(
    subscription: {
        prepaidValidUntil: Date | null;
        trialEndDate: Date | null;
        isTrialActive: boolean;
        isPrepaidActive: boolean;
        billingCycle: number;
        nextBillingDate: Date | null;
    }
): Date | null {
    // Return existing nextBillingDate if set
    if (subscription.nextBillingDate) {
        return subscription.nextBillingDate;
    }

    const now = new Date();

    // Jika masih dalam trial, next billing = trial end date
    if (subscription.isTrialActive && subscription.trialEndDate) {
        return subscription.trialEndDate;
    }

    // Jika masih dalam prepaid, next billing = prepaid valid until
    if (subscription.isPrepaidActive && subscription.prepaidValidUntil) {
        return subscription.prepaidValidUntil;
    }

    // Regular monthly billing
    const nextDate = new Date(now);
    nextDate.setDate(nextDate.getDate() + subscription.billingCycle);
    return nextDate;
}

