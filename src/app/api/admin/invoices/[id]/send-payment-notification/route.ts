
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const invoiceId = params.id;

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { user: true }
        });

        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }

        if (invoice.status !== 'PAID') {
            return NextResponse.json({ success: false, error: 'Invoice belum lunas (PAID). Tidak bisa mengirim bukti bayar.' }, { status: 400 });
        }

        if (!invoice.user.phone) {
            return NextResponse.json({ success: false, error: 'User tidak memiliki nomor telepon.' }, { status: 400 });
        }

        // Get Template
        const templateSetting = await prisma.systemSetting.findUnique({
            where: { key: 'whatsapp_payment_success_template' }
        });

        let messageTemplate = templateSetting?.value;
        if (!messageTemplate) {
            messageTemplate = "Halo {{customerName}}, terima kasih pembayaran invoice {{invoiceNumber}} sebesar {{amount}} telah kami terima pada {{paymentDate}}.";
        }

        // Formatters
        const formatCurrency = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
        const formatDate = (date: Date) => date.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

        const replacements: Record<string, string> = {
            '{{customerName}}': invoice.user.name,
            '{{invoiceNumber}}': invoice.invoiceNumber || '-',
            '{{amount}}': formatCurrency(Number(invoice.amount)),
            '{{paymentDate}}': invoice.paidAt ? formatDate(invoice.paidAt) : formatDate(new Date()),
        };

        let message = messageTemplate;
        for (const [key, value] of Object.entries(replacements)) {
            message = message.replace(new RegExp(key, 'g'), value);
        }

        // Clean phone
        let phone = invoice.user.phone.replace(/\D/g, '');
        if (phone.startsWith('0')) phone = '62' + phone.substring(1);
        const jid = `${phone}@s.whatsapp.net`;

        await prisma.whatsAppOutgoing.create({
            data: {
                jid,
                content: message,
                status: 'PENDING'
            }
        });

        return NextResponse.json({ success: true, message: 'Notifikasi pembayaran berhasil dikirim', data: { phone: invoice.user.phone, message } });

    } catch (error: any) {
        console.error('Error sending payment notification:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
