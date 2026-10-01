import { prisma } from './prisma';
import { sendEmail } from './email';

interface WelcomeMessageVariables {
    customerName: string;
    salesName: string;
    salesPhone: string;
    companyName?: string;
}

/**
 * Get welcome email template from database or use default
 */
async function getWelcomeEmailTemplate(): Promise<{ subject: string; body: string }> {
    try {
        const subjectSetting = await prisma.systemSetting.findUnique({
            where: { key: 'email_welcome_subject' },
        });
        const bodySetting = await prisma.systemSetting.findUnique({
            where: { key: 'email_welcome_body' },
        });

        if (subjectSetting?.value && bodySetting?.value) {
            return {
                subject: subjectSetting.value,
                body: bodySetting.value,
            };
        }
    } catch (error) {
        console.warn('[Welcome Email] Could not fetch template from database, using default');
    }

    // Default template
    return {
        subject: 'Selamat Datang di Layanan Internet Kami',
        body: `
            <html>
                <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                    <h2>Halo {{customerName}} 👋</h2>
                    <p>Selamat datang di layanan internet kami! 🎉</p>
                    <p>Kami ingin memperkenalkan diri bahwa email ini adalah email resmi dari perusahaan kami yang akan digunakan untuk:</p>
                    <ul>
                        <li>✅ Mengirimkan notifikasi tagihan dan pembayaran</li>
                        <li>✅ Mengingatkan tanggal jatuh tempo pembayaran</li>
                        <li>✅ Memberikan informasi penting terkait layanan Anda</li>
                        <li>✅ Memberikan update status instalasi dan aktivasi</li>
                    </ul>
                    <p><strong>📞 Kontak Sales Anda:</strong></p>
                    <ul>
                        <li>👤 Nama: {{salesName}}</li>
                        <li>📱 WhatsApp: {{salesPhone}}</li>
                    </ul>
                    <p>Jika Anda memiliki pertanyaan atau butuh bantuan, silakan hubungi sales Anda di atas.</p>
                    <p>Terima kasih atas kepercayaan Anda menggunakan layanan kami! 🙏</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">Pesan ini dikirim otomatis. Untuk pertanyaan, silakan hubungi sales Anda.</p>
                </body>
            </html>
        `,
    };
}

/**
 * Replace template variables
 */
function replaceTemplateVariables(template: string, variables: WelcomeMessageVariables): string {
    let result = template;
    result = result.replace(/\{\{customerName\}\}/g, variables.customerName);
    result = result.replace(/\{\{salesName\}\}/g, variables.salesName);
    result = result.replace(/\{\{salesPhone\}\}/g, variables.salesPhone);
    if (variables.companyName) {
        result = result.replace(/\{\{companyName\}\}/g, variables.companyName);
    }
    return result;
}

/**
 * Send welcome email message to new customer
 * @param userId - User ID
 * @param forceResend - If true, send even if already sent before
 */
export async function sendWelcomeEmailMessage(
    userId: string,
    forceResend: boolean = false
): Promise<boolean> {
    try {
        // Get user with sales info
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                salesPerson: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
            },
        });

        if (!user || !user.email) {
            console.warn(`[Welcome Email] User ${userId} not found or has no email`);
            return false;
        }

        // Check if welcome email already sent (unless forceResend is true)
        if (!forceResend && user.welcomeEmailSent) {
            console.log(`[Welcome Email] Welcome email already sent to ${user.name}. Use forceResend=true to send again.`);
            return false;
        }

        // Get sales info
        const salesName = user.salesPerson?.name || 'Tim Sales';
        const salesPhone = user.salesPerson?.phone || '-';

        // Get template
        const template = await getWelcomeEmailTemplate();

        // Prepare variables
        const variables: WelcomeMessageVariables = {
            customerName: user.name,
            salesName,
            salesPhone,
            companyName: 'ISP Management', // Can be made configurable
        };

        // Replace variables
        const subject = replaceTemplateVariables(template.subject, variables);
        const body = replaceTemplateVariables(template.body, variables);

        // Send email
        const emailSent = await sendEmail({
            to: user.email,
            subject,
            html: body,
        });

        if (emailSent) {
            // Update user flag
            await prisma.user.update({
                where: { id: userId },
                data: {
                    welcomeEmailSent: true,
                    welcomeEmailSentAt: new Date(),
                },
            });

            console.log(`[Welcome Email] Welcome email sent to ${user.name} (${user.email})`);
            return true;
        } else {
            console.error(`[Welcome Email] Failed to send email to ${user.email}`);
            return false;
        }
    } catch (error: any) {
        console.error('[Welcome Email] Error sending welcome email:', error);
        return false;
    }
}

