import { prisma } from './prisma';
import { sendEmail } from './email';

interface ReminderTemplate {
    whatsapp: string;
    email: {
        subject: string;
        body: string;
    };
}

interface ReminderVariables {
    customerName: string;
    invoiceNumber: string;
    amount: string;
    dueDate: string;
    paymentLink: string;
    daysUntilDue: number;
    salesName: string;
    salesPhoneNumber: string;
}

/**
 * Get reminder template from database or use default
 * ✅ UPDATE: Reminder types sekarang D-5, D-0, D+3, D+5, MANUAL
 */
async function getReminderTemplate(reminderType: 'D-5' | 'D-0' | 'D+3' | 'D+5' | 'MANUAL'): Promise<ReminderTemplate> {
    // Handle special case for overdue reminders
    const reminderKey = reminderType === 'MANUAL' ? 'manual' : reminderType.replace('+', '_plus').replace('-', '_minus');
    const whatsappKey = `reminder_whatsapp_${reminderKey}`;
    const emailSubjectKey = `reminder_email_subject_${reminderKey}`;
    const emailBodyKey = `reminder_email_body_${reminderKey}`;

    // Try to get from database
    const [whatsappSetting, emailSubjectSetting, emailBodySetting] = await Promise.all([
        prisma.systemSetting.findUnique({ where: { key: whatsappKey } }),
        prisma.systemSetting.findUnique({ where: { key: emailSubjectKey } }),
        prisma.systemSetting.findUnique({ where: { key: emailBodyKey } }),
    ]);

    // Use database value or default
    const whatsapp = whatsappSetting?.value || getDefaultWhatsAppTemplate(reminderType as any);
    const emailSubject = emailSubjectSetting?.value || getDefaultEmailSubject(reminderType as any);
    const emailBody = emailBodySetting?.value || getDefaultEmailBody(reminderType as any);

    return {
        whatsapp,
        email: {
            subject: emailSubject,
            body: emailBody,
        },
    };
}

/**
 * Replace template variables with actual values
 */
function replaceTemplateVariables(template: string, variables: ReminderVariables): string {
    let result = template;
    result = result.replace(/\{\{customerName\}\}/g, variables.customerName);
    result = result.replace(/\{\{invoiceNumber\}\}/g, variables.invoiceNumber);
    result = result.replace(/\{\{amount\}\}/g, variables.amount);
    result = result.replace(/\{\{dueDate\}\}/g, variables.dueDate);
    result = result.replace(/\{\{paymentLink\}\}/g, variables.paymentLink);
    result = result.replace(/\{\{daysUntilDue\}\}/g, variables.daysUntilDue.toString());
    result = result.replace(/\{\{salesName\}\}/g, variables.salesName);
    result = result.replace(/\{\{salesPhoneNumber\}\}/g, variables.salesPhoneNumber);
    return result;
}

/**
 * Send reminder via WhatsApp
 */
async function sendWhatsAppReminder(phone: string, message: string): Promise<boolean> {
    try {
        // Clean phone number
        let cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1);
        } else if (!cleanPhone.startsWith('62')) {
            cleanPhone = '62' + cleanPhone;
        }

        const jid = `${cleanPhone}@s.whatsapp.net`;

        // Queue message via WhatsAppOutgoing
        await prisma.whatsAppOutgoing.create({
            data: {
                jid,
                content: message,
                status: 'PENDING',
            },
        });

        console.log(`[Reminder] WhatsApp message queued for ${phone}`);
        return true;
    } catch (error: any) {
        console.error('[Reminder] Error sending WhatsApp:', error);
        return false;
    }
}

/**
 * Send reminder via Email
 * ⚠️ DISABLED - Email reminder dinonaktifkan sementara
 */
async function sendEmailReminder(email: string, subject: string, body: string): Promise<boolean> {
    // ⚠️ ALL REMINDERS DISABLED - Email reminder dinonaktifkan
    console.log(`[Reminder] ⚠️ Email reminder DISABLED - Would send to: ${email}`);
    console.log(`[Reminder]   Subject: ${subject}`);
    return false; // Always return false (disabled)
}

/**
 * Send payment reminder
 * ✅ UPDATE: Reminder types sekarang D-5, D-0, D+3, D+5, MANUAL
 * ✅ WhatsApp diaktifkan kembali dengan check whatsappSent flag
 * 
 * @param invoiceId - Invoice ID
 * @param reminderType - Reminder type (D-5, D-0, D+3, D+5, MANUAL)
 * @param reminderId - Optional ScheduledReminder ID untuk check whatsappSent flag
 */
export async function sendPaymentReminder(
    invoiceId: string,
    reminderType: 'D-5' | 'D-0' | 'D+3' | 'D+5' | 'MANUAL',
    reminderId?: string
): Promise<{ whatsapp: boolean; email: boolean }> {
    try {
        // ✅ Check apakah WhatsApp sudah pernah dikirim untuk reminder ini
        if (reminderId) {
            const reminder = await prisma.scheduledReminder.findUnique({
                where: { id: reminderId },
            });

            if (reminder?.whatsappSent) {
                console.log(`[Reminder] WhatsApp already sent for reminder ${reminderId} (${reminderType}), skipping duplicate`);
                return { whatsapp: false, email: false };
            }
        }

        // Get invoice with user data and sales
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                user: {
                    include: {
                        salesPerson: true, // Include sales data
                    },
                },
            },
        });

        if (!invoice || !invoice.user) {
            throw new Error('Invoice or user not found');
        }

        // Skip if already paid
        if (invoice.status === 'PAID') {
            console.log(`[Reminder] Invoice ${invoice.invoiceNumber} already paid, skipping reminder`);
            return { whatsapp: false, email: false };
        }

        // Get template
        const template = await getReminderTemplate(reminderType);

        // Calculate days overdue (negative if overdue)
        const daysUntilDue = Math.ceil((invoice.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;

        // Get sales data
        const salesName = invoice.user.salesPerson?.name || 'Sales Support';
        const salesPhoneNumber = invoice.user.salesPerson?.phone || '';

        // Prepare variables
        const variables: ReminderVariables = {
            customerName: invoice.user.name,
            invoiceNumber: invoice.invoiceNumber || 'N/A',
            amount: `Rp ${Number(invoice.amount).toLocaleString('id-ID')}`,
            dueDate: new Date(invoice.dueDate).toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            }),
            paymentLink: invoice.xenditUrl || 'Link akan dikirim segera',
            daysUntilDue: daysUntilDue < 0 ? -daysOverdue : daysUntilDue, // Negative for overdue
            salesName,
            salesPhoneNumber,
        };

        // Replace variables in templates
        const whatsappMessage = replaceTemplateVariables(template.whatsapp, variables);
        const emailSubject = replaceTemplateVariables(template.email.subject, variables);
        const emailBody = replaceTemplateVariables(template.email.body, variables);

        // ✅ WhatsApp ENABLED - Kirim WhatsApp reminder
        const whatsappResult = await sendWhatsAppReminder(invoice.user.phone, whatsappMessage);

        // Email tetap disabled
        const emailResult = false; // Email disabled

        // Update reminder record jika reminderId diberikan
        if (reminderId && whatsappResult) {
            await prisma.scheduledReminder.update({
                where: { id: reminderId },
                data: {
                    whatsappSent: true,
                    // Update status dan sentAt jika semua channel sudah dikirim
                    status: 'SENT',
                    sentAt: new Date(),
                },
            });
        }

        console.log(`[Reminder] Reminder sent for invoice ${invoice.invoiceNumber} (${reminderType})`);
        console.log(`[Reminder]   - WhatsApp: ${whatsappResult ? 'sent' : 'failed'}`);
        console.log(`[Reminder]   - Email: disabled`);

        return {
            whatsapp: whatsappResult,
            email: emailResult,
        };
    } catch (error: any) {
        console.error(`[Reminder] Error sending ${reminderType} reminder:`, error);
        return { whatsapp: false, email: false };
    }
}

/**
 * Default WhatsApp templates
 * ✅ UPDATE: Template untuk D-5, D-0, D+3, D+5
 */
function getDefaultWhatsAppTemplate(reminderType: 'D-5' | 'D-0' | 'D+3' | 'D+5'): string {
    const templates = {
        'D-5': `Halo {{customerName}} 👋

Kami ingin mengingatkan bahwa tagihan Anda akan jatuh tempo dalam 5 hari.

📋 Invoice: {{invoiceNumber}}
💰 Total: {{amount}}
📅 Jatuh Tempo: {{dueDate}}

Silakan lakukan pembayaran melalui link berikut:
{{paymentLink}}

Terima kasih atas kepercayaan Anda menggunakan layanan kami. 🙏

*Pesan ini dikirim otomatis. Mohon jangan membalas pesan ini.*`,

        'D-0': `Halo {{customerName}} 👋

⚠️ PENTING: Hari ini adalah tanggal jatuh tempo pembayaran Anda!

📋 Invoice: {{invoiceNumber}}
💰 Total: {{amount}}
📅 Jatuh Tempo: {{dueDate}}

Silakan lakukan pembayaran segera melalui link berikut:
{{paymentLink}}

Mohon lakukan pembayaran hari ini untuk menghindari denda keterlambatan. Terima kasih! 🙏

*Pesan ini dikirim otomatis. Mohon jangan membalas pesan ini.*`,

        'D+3': `Halo {{customerName}} 👋

⚠️ PENTING: Tagihan Anda sudah terlambat 3 hari!

📋 Invoice: {{invoiceNumber}}
💰 Total: {{amount}}
📅 Jatuh Tempo: {{dueDate}}
⏰ Terlambat: 3 hari

Silakan lakukan pembayaran segera melalui link berikut:
{{paymentLink}}

Peringatan: Jika pembayaran tidak dilakukan dalam 2 hari ke depan, layanan Anda akan diblokir sementara. Mohon segera lakukan pembayaran. Terima kasih! 🙏

*Pesan ini dikirim otomatis. Mohon jangan membalas pesan ini.*`,

        'D+5': `Halo {{customerName}} 👋

🚨 PENTING: Tagihan Anda sudah terlambat 5 hari!

📋 Invoice: {{invoiceNumber}}
💰 Total: {{amount}}
📅 Jatuh Tempo: {{dueDate}}
⏰ Terlambat: 5 hari

⚠️ Layanan Anda akan diblokir sementara sampai pembayaran dilakukan.

Silakan lakukan pembayaran segera melalui link berikut:
{{paymentLink}}

Setelah pembayaran berhasil, layanan akan diaktifkan kembali dalam 1x24 jam. Terima kasih atas pengertiannya! 🙏

*Pesan ini dikirim otomatis. Mohon jangan membalas pesan ini.*`,

        'MANUAL': `Halo {{customerName}} 👋

Kami ingin mengingatkan mengenai tagihan Anda yang belum dibayar.

📋 Invoice: {{invoiceNumber}}
💰 Total: {{amount}}
📅 Jatuh Tempo: {{dueDate}}

Silakan lakukan pembayaran melalui link berikut:
{{paymentLink}}

Jika Anda sudah melakukan pembayaran, mohon abaikan pesan ini. Terima kasih! 🙏`,
    };

    return templates[reminderType] || templates['D-0'];
}

/**
 * Default Email subjects
 * ✅ UPDATE: Subjects untuk D-5, D-0, D+3, D+5
 */
function getDefaultEmailSubject(reminderType: 'D-5' | 'D-0' | 'D+3' | 'D+5'): string {
    const subjects = {
        'D-5': 'Pengingat Pembayaran - Invoice {{invoiceNumber}}',
        'D-0': 'Hari Ini Jatuh Tempo - Invoice {{invoiceNumber}}',
        'D+3': '⚠️ Tagihan Terlambat 3 Hari - Invoice {{invoiceNumber}}',
        'D+5': '🚨 PENTING: Tagihan Terlambat 5 Hari - Invoice {{invoiceNumber}}',
        'MANUAL': 'Pengingat Pembayaran - Invoice {{invoiceNumber}}',
    };

    return subjects[reminderType] || subjects['D-0'];
}

/**
 * Default Email bodies
 * ✅ UPDATE: Bodies untuk D-5, D-0, D+3, D+5
 */
function getDefaultEmailBody(reminderType: 'D-5' | 'D-0' | 'D+3' | 'D+5'): string {
    const bodies = {
        'D-5': `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .invoice-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Pengingat Pembayaran</h1>
        </div>
        <div class="content">
            <p>Yth. <strong>{{customerName}}</strong>,</p>
            <p>Kami ingin mengingatkan bahwa tagihan Anda akan jatuh tempo dalam <strong>5 hari</strong>.</p>
            
            <div class="invoice-details">
                <div class="detail-row">
                    <span><strong>Invoice:</strong></span>
                    <span>{{invoiceNumber}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Total:</strong></span>
                    <span>{{amount}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Jatuh Tempo:</strong></span>
                    <span>{{dueDate}}</span>
                </div>
            </div>

            <p style="text-align: center;">
                <a href="{{paymentLink}}" class="button">Bayar Sekarang</a>
            </p>

            <p>Terima kasih atas kepercayaan Anda menggunakan layanan kami.</p>
            
            <div class="footer">
                <p>Pesan ini dikirim otomatis. Mohon jangan membalas email ini.</p>
            </div>
        </div>
    </div>
</body>
</html>`,

        'D-0': `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .invoice-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .button { display: inline-block; background-color: #EF4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        .urgent { background-color: #FEE2E2; padding: 15px; border-left: 4px solid #EF4444; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Hari Ini Jatuh Tempo</h1>
        </div>
        <div class="content">
            <p>Yth. <strong>{{customerName}}</strong>,</p>
            
            <div class="urgent">
                <p><strong>PENTING:</strong> Hari ini adalah tanggal jatuh tempo pembayaran Anda!</p>
            </div>
            
            <div class="invoice-details">
                <div class="detail-row">
                    <span><strong>Invoice:</strong></span>
                    <span>{{invoiceNumber}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Total:</strong></span>
                    <span>{{amount}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Jatuh Tempo:</strong></span>
                    <span>{{dueDate}}</span>
                </div>
            </div>

            <p style="text-align: center;">
                <a href="{{paymentLink}}" class="button">Bayar Sekarang</a>
            </p>

            <p>Mohon lakukan pembayaran hari ini untuk menghindari denda keterlambatan. Terima kasih!</p>
            
            <div class="footer">
                <p>Pesan ini dikirim otomatis. Mohon jangan membalas email ini.</p>
            </div>
        </div>
    </div>
</body>
</html>`,

        'D+3': `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .invoice-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .button { display: inline-block; background-color: #F59E0B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        .warning { background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Tagihan Terlambat 3 Hari</h1>
        </div>
        <div class="content">
            <p>Yth. <strong>{{customerName}}</strong>,</p>
            
            <div class="warning">
                <p><strong>PENTING:</strong> Tagihan Anda sudah terlambat 3 hari!</p>
            </div>
            
            <div class="invoice-details">
                <div class="detail-row">
                    <span><strong>Invoice:</strong></span>
                    <span>{{invoiceNumber}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Total:</strong></span>
                    <span>{{amount}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Jatuh Tempo:</strong></span>
                    <span>{{dueDate}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Terlambat:</strong></span>
                    <span>3 hari</span>
                </div>
            </div>

            <p style="text-align: center;">
                <a href="{{paymentLink}}" class="button">Bayar Sekarang</a>
            </p>

            <p><strong>Peringatan:</strong> Jika pembayaran tidak dilakukan dalam 2 hari ke depan, layanan Anda akan diblokir sementara. Mohon segera lakukan pembayaran. Terima kasih!</p>
            
            <div class="footer">
                <p>Pesan ini dikirim otomatis. Mohon jangan membalas email ini.</p>
            </div>
        </div>
    </div>
</body>
</html>`,

        'D+5': `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #991B1B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .invoice-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .button { display: inline-block; background-color: #991B1B; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
        .critical { background-color: #FEE2E2; padding: 15px; border-left: 4px solid #991B1B; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚨 PENTING: Tagihan Terlambat 5 Hari</h1>
        </div>
        <div class="content">
            <p>Yth. <strong>{{customerName}}</strong>,</p>
            
            <div class="critical">
                <p><strong>PENTING:</strong> Tagihan Anda sudah terlambat 5 hari!</p>
                <p><strong>⚠️ Layanan Anda akan diblokir sementara sampai pembayaran dilakukan.</strong></p>
            </div>
            
            <div class="invoice-details">
                <div class="detail-row">
                    <span><strong>Invoice:</strong></span>
                    <span>{{invoiceNumber}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Total:</strong></span>
                    <span>{{amount}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Jatuh Tempo:</strong></span>
                    <span>{{dueDate}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Terlambat:</strong></span>
                    <span>5 hari</span>
                </div>
            </div>

            <p style="text-align: center;">
                <a href="{{paymentLink}}" class="button">Bayar Sekarang</a>
            </p>

            <p>Setelah pembayaran berhasil, layanan akan diaktifkan kembali dalam 1x24 jam. Terima kasih atas pengertiannya!</p>
            
            <div class="footer">
                <p>Pesan ini dikirim otomatis. Mohon jangan membalas email ini.</p>
            </div>
        </div>
    </div>
</body>
</html>`,

        'MANUAL': `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .invoice-details { background-color: white; padding: 20px; border-radius: 5px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .button { display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Pengingat Pembayaran</h1>
        </div>
        <div class="content">
            <p>Yth. <strong>{{customerName}}</strong>,</p>
            <p>Kami ingin mengingatkan mengenai tagihan Anda yang belum dibayar.</p>
            
            <div class="invoice-details">
                <div class="detail-row">
                    <span><strong>Invoice:</strong></span>
                    <span>{{invoiceNumber}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Total:</strong></span>
                    <span>{{amount}}</span>
                </div>
                <div class="detail-row">
                    <span><strong>Jatuh Tempo:</strong></span>
                    <span>{{dueDate}}</span>
                </div>
            </div>

            <p style="text-align: center;">
                <a href="{{paymentLink}}" class="button">Bayar Sekarang</a>
            </p>

            <p>Jika Anda sudah melakukan pembayaran, mohon abaikan pesan ini. Terima kasih!</p>
            
            <div class="footer">
                <p>Pesan ini dikirim otomatis. Mohon jangan membalas email ini.</p>
            </div>
        </div>
    </div>
</body>
</html>`,
    };

    return bodies[reminderType] || bodies['D-0'];
}
