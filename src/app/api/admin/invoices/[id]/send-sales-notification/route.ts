
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    try {
        const params = await props.params;
        const invoiceId = params.id;

        // 1. Get Invoice with User and Sales relations
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                user: {
                    include: {
                        salesPerson: true
                    }
                }
            }
        });

        if (!invoice) {
            return NextResponse.json(
                { success: false, error: 'Invoice not found' },
                { status: 404 }
            );
        }

        const sales = invoice.user.salesPerson;
        if (!sales) {
            return NextResponse.json(
                { success: false, error: 'Pelanggan ini tidak memiliki Sales yang ditugaskan.' },
                { status: 400 }
            );
        }

        if (!sales.phone) {
            return NextResponse.json(
                { success: false, error: 'Data Sales tidak memiliki nomor telepon.' },
                { status: 400 }
            );
        }

        // 2. Get Template
        const templateSetting = await prisma.systemSetting.findUnique({
            where: { key: 'whatsapp_sales_invoice_template' }
        });

        let messageTemplate = templateSetting?.value;
        if (!messageTemplate) {
            // Default template if not set
            messageTemplate = "Halo {{salesName}}, pelanggan Anda {{customerName}} memiliki invoice baru {{invoiceNumber}} sebesar {{amount}} yang jatuh tempo pada {{dueDate}}. Harap dipantau.";
        }

        // 3. Format Message
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
            '{{salesName}}': sales.name,
            '{{customerName}}': invoice.user.name,
            '{{invoiceNumber}}': invoice.invoiceNumber || '-',
            '{{amount}}': formatCurrency(Number(invoice.amount)),
            '{{dueDate}}': formatDate(invoice.dueDate),
            '{{paymentLink}}': invoice.xenditUrl || '(Belum ada link)',
            '{{period}}': invoice.description || '-',
        };

        let message = messageTemplate;
        for (const [key, value] of Object.entries(replacements)) {
            message = message.replace(new RegExp(key, 'g'), value);
        }

        // 4. Send Message (Create WhatsAppOutgoing)
        // Ensure sales phone number is in correct format (remove leading 0 if needed, usually handling by worker, but let's assume JID format or clean number)
        // Actually the worker usually expects JID (e.g. 628123@s.whatsapp.net) or just number if creating conversation?
        // Let's look at `worker/whatsapp.ts` or similar usage. 
        // Based on `WhatsAppOutgoing` model, it takes `jid`. 
        // We might need to format the number. Assuming `sales.phone` is stored as e.g. "08123" or "628123".
        // Let's formatting basic logic: 08xx -> 628xx.

        let salesPhone = sales.phone.replace(/\D/g, ''); // Remove non-digits
        if (salesPhone.startsWith('0')) {
            salesPhone = '62' + salesPhone.substring(1);
        }
        const salesJid = `${salesPhone}@s.whatsapp.net`;

        await prisma.whatsAppOutgoing.create({
            data: {
                jid: salesJid,
                content: message,
                status: 'PENDING'
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Notifikasi berhasil dikirim ke Sales',
            data: {
                salesName: sales.name,
                salesPhone: sales.phone,
                messagePreview: message
            }
        });

    } catch (error: any) {
        console.error('Error sending sales notification:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
