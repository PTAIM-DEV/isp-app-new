import { prisma } from './prisma';
import { formatDate } from './utils';

export type PaymentGateType = 'INSTALLATION' | 'FIRST_MONTH';

export interface PaymentGateStatus {
    hasInvoice: boolean;
    isPaid: boolean;
    canProceed: boolean;
    invoice?: any;
}

/**
 * Check if payment gate is blocking the workflow
 */
export async function checkPaymentGateStatus(
    userId: string,
    gateType: PaymentGateType
): Promise<PaymentGateStatus> {
    const invoiceType = gateType === 'INSTALLATION' ? 'INSTALLATION' : 'MONTHLY';

    const invoice = await prisma.invoice.findFirst({
        where: {
            userId,
            type: invoiceType,
            isPaymentGate: true,
            deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
    });

    if (!invoice) {
        return {
            hasInvoice: false,
            isPaid: false,
            canProceed: true, // No gate = can proceed
        };
    }

    const isPaid = invoice.status === 'PAID';

    return {
        hasInvoice: true,
        isPaid,
        canProceed: isPaid,
        invoice: {
            ...invoice,
            amount: Number(invoice.amount),
            subtotal: invoice.subtotal ? Number(invoice.subtotal) : undefined,
            taxAmount: invoice.taxAmount ? Number(invoice.taxAmount) : undefined,
            feeAmount: invoice.feeAmount ? Number(invoice.feeAmount) : undefined,
        },
    };
}

/**
 * Generate WhatsApp payment link with message
 */
export function generateWhatsAppPaymentLink(
    phoneNumber: string,
    invoice: any,
    customerName: string
): string {
    // Clean phone number: remove leading 0 and add 62
    let cleanPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (cleanPhone.startsWith('0')) {
        cleanPhone = '62' + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith('62')) {
        cleanPhone = '62' + cleanPhone;
    }

    const invoiceType = invoice.category === 'INSTALLATION_FEE'
        ? 'Biaya Instalasi'
        : 'Pembayaran Bulan Pertama';

    const message = `Halo ${customerName},

Terima kasih telah mendaftar layanan internet kami! 🎉

Berikut adalah detail pembayaran Anda:
📋 Invoice: ${invoice.invoiceNumber || 'Pending'}
💰 Total: Rp ${Number(invoice.amount).toLocaleString('id-ID')}
📅 Jatuh Tempo: ${formatDate(invoice.dueDate)}
📝 Keterangan: ${invoiceType}

Silakan lakukan pembayaran melalui link berikut:
${invoice.xenditUrl || '[Link akan dikirim segera]'}

${invoice.category === 'INSTALLATION_FEE'
            ? 'Setelah pembayaran berhasil, instalasi akan segera dijadwalkan.'
            : 'Setelah pembayaran berhasil, layanan Anda akan segera diaktifkan.'}

Terima kasih! 🙏`;

    const encodedMessage = encodeURIComponent(message);

    return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Format invoice amount for display
 */
export function formatInvoiceAmount(amount: number | string): string {
    return `Rp ${Number(amount).toLocaleString('id-ID')}`;
}
