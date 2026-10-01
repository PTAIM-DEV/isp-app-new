import { prisma } from './prisma';

interface WelcomeMessageVariables {
    customerName: string;
    customerId?: string;
    salesName: string;
    salesPhone: string;
    packageName?: string;
    companyName?: string;
}

/**
 * Helper to process Spintax {A|B|C}
 */
function processSpintax(text: string): string {
    return text.replace(/\{([^{}]+)\}/g, (match, content) => {
        const choices = content.split('|');
        return choices[Math.floor(Math.random() * choices.length)];
    });
}

/**
 * Get randomized welcome WhatsApp template
 */
async function getWelcomeTemplate(): Promise<string> {
    try {
        // Fetch all active templates
        // Note: In a high-traffic app, we might want to cache this
        const templates = await prisma.whatsAppTemplate.findMany({
            where: { isActive: true }
        });

        if (templates.length > 0) {
            // Pick random template
            const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
            return processSpintax(randomTemplate.content);
        }

        // Legacy fallback removed.
        // If no active templates found, return default.
    } catch (error) {
        console.warn('[Welcome] Could not fetch templates from database, using default');
    }

    // Default template (Spintax enabled)
    return processSpintax(`{Halo|Hai|Selamat Pagi} {{customerName}} 👋

{Selamat datang|Terima kasih telah bergabung} di layanan internet kami! {🎉|🚀|✨}
Paket Anda: {{packageName}}

Kami ingin memperkenalkan diri bahwa nomor WhatsApp ini adalah nomor resmi dari perusahaan kami yang akan digunakan untuk:
✅ Mengirimkan notifikasi tagihan dan pembayaran
✅ Mengingatkan tanggal jatuh tempo pembayaran
✅ Memberikan informasi penting terkait layanan Anda
✅ Memberikan update status instalasi dan aktivasi

*Mohon jangan memblokir nomor ini* agar Anda tetap menerima informasi penting.

📞 *Kontak Sales Anda:*
👤 Nama: {{salesName}}
📱 WhatsApp: {{salesPhoneNumber}}

Jika butuh bantuan, silakan hubungi sales Anda atau balas pesan ini.

Terima kasih atas kepercayaannya! 🙏`);
}

/**
 * Replace template variables
 */
function replaceTemplateVariables(template: string, variables: WelcomeMessageVariables): string {
    let result = template;

    // Customer Name
    result = result.replace(/\{\{customerName\}\}/g, variables.customerName);
    result = result.replace(/\{\{name\}\}/g, variables.customerName); // Alias

    // Customer ID
    if (variables.customerId) {
        result = result.replace(/\{\{customerId\}\}/g, variables.customerId);
        result = result.replace(/\{\{id\}\}/g, variables.customerId); // Alias
    }

    // Sales Info
    result = result.replace(/\{\{salesName\}\}/g, variables.salesName);
    result = result.replace(/\{\{salesPhone\}\}/g, variables.salesPhone);
    result = result.replace(/\{\{salesPhoneNumber\}\}/g, variables.salesPhone);
    result = result.replace(/\{\{salesMobile\}\}/g, variables.salesPhone); // Alias

    // Package Name
    const packageName = variables.packageName || 'Layanan Internet';
    result = result.replace(/\{\{packageName\}\}/g, packageName);

    if (variables.companyName) {
        result = result.replace(/\{\{companyName\}\}/g, variables.companyName);
    }
    return result;
}

/**
 * Send welcome WhatsApp message to new customer
 * @param userId - User ID
 * @param forceResend - If true, send even if already sent before
 */
export async function sendWelcomeWhatsAppMessage(
    userId: string,
    forceResend: boolean = false,
    customContent?: string
): Promise<boolean> {
    try {
        // Get user with sales info and subscription
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                salesPerson: {
                    select: {
                        name: true,
                        phone: true,
                    },
                },
                subscription: {
                    select: {
                        planName: true
                    }
                }
            },
        });

        if (!user || !user.phone) {
            console.warn(`[Welcome] User ${userId} not found or has no phone number`);
            return false;
        }

        // Clean phone number
        let cleanPhone = user.phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1);
        } else if (!cleanPhone.startsWith('62')) {
            cleanPhone = '62' + cleanPhone;
        }

        const jid = `${cleanPhone}@s.whatsapp.net`;

        // Check if welcome message already sent
        if (!forceResend) {
            if (user.welcomeWhatsappSent) {
                console.log(`[Welcome] Welcome message already sent to ${user.name} (flag set).`);
                return false;
            }

            // Also check Metadata in WhatsAppOutgoing
            const existingWelcome = await prisma.whatsAppOutgoing.findFirst({
                where: {
                    jid,
                    metadata: {
                        path: ['type'],
                        equals: 'WELCOME'
                    },
                    status: 'SENT',
                },
            });

            if (existingWelcome) {
                // Update flag if found
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        welcomeWhatsappSent: true,
                        welcomeWhatsappSentAt: existingWelcome.createdAt,
                    },
                });
                return false;
            }
        }

        // Get sales info
        const salesName = user.salesPerson?.name || 'Tim Sales';
        const salesPhone = user.salesPerson?.phone || '-';
        const packageName = user.subscription?.planName;

        // Get template (Randomized & Spintaxed)
        // If custom content provided, use it. Otherwise generate from template.
        let message = '';
        if (customContent) {
            message = customContent;
        } else {
            const templateContent = await getWelcomeTemplate();

            // Prepare variables
            const variables: WelcomeMessageVariables = {
                customerName: user.name,
                salesName,
                salesPhone,
                packageName,
                companyName: 'ISP Management',
            };

            // Replace variables
            message = replaceTemplateVariables(templateContent, variables);
        }

        // Queue message via WhatsAppOutgoing with Metadata
        await prisma.whatsAppOutgoing.create({
            data: {
                jid,
                content: message,
                status: 'PENDING',
                metadata: {
                    type: 'WELCOME',
                    userId: userId
                }
            },
        });

        console.log(`[Welcome] Queued for ${user.name}`);

        // Optimistically update flag
        await prisma.user.update({
            where: { id: userId },
            data: {
                welcomeWhatsappSent: true,
                welcomeWhatsappSentAt: new Date(),
            },
        });

        return true;
    } catch (error: any) {
        console.error('[Welcome] Error sending welcome WhatsApp message:', error);
        return false;
    }
}

/**
 * Get welcome message preview for a user (without sending)
 */
export async function getWelcomeMessagePreview(userId: string): Promise<string | null> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                salesPerson: true,
                subscription: true
            },
        });

        if (!user) return null;

        const salesName = user.salesPerson?.name || 'Tim Sales';
        const salesPhone = user.salesPerson?.phone || '-';
        const packageName = user.subscription?.planName;

        const templateContent = await getWelcomeTemplate();

        const variables: WelcomeMessageVariables = {
            customerName: user.name,
            salesName,
            salesPhone,
            packageName,
            companyName: 'ISP Management',
        };

        return replaceTemplateVariables(templateContent, variables);
    } catch (error) {
        console.error('[Welcome] Error generating preview:', error);
        return null;
    }
}


/**
 * Get default welcome template
 */
export function getDefaultWelcomeTemplate(): string {
    return processSpintax(`{Halo|Hai} {{customerName}} 👋

Selamat datang di layanan internet kami! 🎉`);
}

