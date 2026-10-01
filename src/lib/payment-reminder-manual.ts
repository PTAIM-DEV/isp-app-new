import { prisma } from './prisma';
import { sendEmail } from './email';
import { formatPhoneToJid } from './utils/whatsapp-jid';

/**
 * Send WhatsApp reminder
 */
async function sendWhatsAppReminder(phone: string, message: string, scheduledAt?: Date): Promise<boolean> {
    if (!phone) {
        console.warn('[Reminder] No phone number provided');
        return false;
    }

    try {
        // Format phone number to correct JID format
        const jid = formatPhoneToJid(phone);

        // Create WhatsApp outgoing message record
        console.log(`[Reminder] Scheduling WhatsApp for ${jid} at ${scheduledAt ? scheduledAt.toISOString() : 'IMMEDIATELY'}`);
        await prisma.whatsAppOutgoing.create({
            data: {
                jid,
                content: message,
                status: 'PENDING',
                scheduledAt: scheduledAt || null,
            },
        });
        return true;
    } catch (error: any) {
        console.error('[Reminder] Error creating WhatsApp message:', error.message || error);
        return false;
    }
}

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
}

/**
 * Get reminder template from database or use default
 */
async function getReminderTemplate(reminderType: 'H-5' | 'H-2' | 'H-0' | 'D+1' | 'D+2' | 'D+5'): Promise<ReminderTemplate> {
    const reminderKey = reminderType.replace('+', '_plus');
    const whatsappKey = `reminder_whatsapp_${reminderKey}`;
    const emailSubjectKey = `reminder_email_subject_${reminderKey}`;
    const emailBodyKey = `reminder_email_body_${reminderKey}`;

    const [whatsappSetting, emailSubjectSetting, emailBodySetting] = await Promise.all([
        prisma.systemSetting.findUnique({ where: { key: whatsappKey } }),
        prisma.systemSetting.findUnique({ where: { key: emailSubjectKey } }),
        prisma.systemSetting.findUnique({ where: { key: emailBodyKey } }),
    ]);

    const whatsapp = whatsappSetting?.value || getDefaultWhatsAppTemplate(reminderType);
    const emailSubject = emailSubjectSetting?.value || getDefaultEmailSubject(reminderType);
    const emailBody = emailBodySetting?.value || getDefaultEmailBody(reminderType);

    return {
        whatsapp,
        email: {
            subject: emailSubject,
            body: emailBody,
        },
    };
}

function replaceTemplateVariables(template: string, variables: ReminderVariables): string {
    let result = template;
    result = result.replace(/\{\{customerName\}\}/g, variables.customerName);
    result = result.replace(/\{\{invoiceNumber\}\}/g, variables.invoiceNumber);
    result = result.replace(/\{\{amount\}\}/g, variables.amount);
    result = result.replace(/\{\{dueDate\}\}/g, variables.dueDate);
    result = result.replace(/\{\{paymentLink\}\}/g, variables.paymentLink);
    result = result.replace(/\{\{daysUntilDue\}\}/g, variables.daysUntilDue.toString());
    return result;
}

async function sendEmailReminder(email: string, subject: string, body: string): Promise<boolean> {
    // ⚠️ ALL REMINDERS DISABLED - Email reminder dinonaktifkan sementara
    console.log(`[Manual Reminder] ⚠️ Email reminder DISABLED - Would send to: ${email}`);
    console.log(`[Manual Reminder]   Subject: ${subject}`);
    return false; // Always return false (disabled)

    // Uncomment untuk enable kembali:
    // if (!email) return false;
    // return await sendEmail({
    //     to: email,
    //     subject,
    //     html: body,
    // });
}

// Random Helper
function getRandomItem<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
}

// Safe Flow Helpers
function getTimeBasedGreeting(): string {
    // WIB logic (Server might be UTC)
    const wibHour = (new Date().getUTCHours() + 7) % 24;

    if (wibHour >= 3 && wibHour < 11) return 'Pagi';
    if (wibHour >= 11 && wibHour < 15) return 'Siang';
    if (wibHour >= 15 && wibHour < 18) return 'Sore';
    return 'Malam';
}

function getSafeGreeting(name: string, customList?: string[]): string {
    const time = getTimeBasedGreeting();

    // If custom list exists and has items, use it but try to replace {{time}} or just use as is
    if (customList && customList.length > 0) {
        const raw = getRandomItem(customList);
        // support minimal replacement if user wants generic time
        // return raw.replace(/{{time}}/g, time).replace(/{{name}}/g, name);
        // For simplicity, just return raw for now, or maybe the user just inputs "Selamat Pagi kak" directly in the list
        // If the user inputs "Selamat {{time}} kak", we can replace it.
        return raw.replace(/{{time}}/gi, time).replace(/{{name}}/gi, name);
    }

    // Default Fallback
    const greetings = [
        `Selamat ${time} kak`,
        `Halo, selamat ${time} kak`,
        `${time} kak`,
        `Permisi kak, selamat ${time}`,
        `Hai kak, selamat ${time}`,
    ];
    return getRandomItem(greetings);
}

function getSafeApology(customList?: string[]): string {
    if (customList && customList.length > 0) {
        return getRandomItem(customList);
    }

    const apologies = [
        "Mohon maaf mengganggu waktunya sebentar",
        "Maaf ya kak ganggu waktunya",
        "Punten kak, maaf ganggu sebentar",
        "Maaf mengganggu aktivitasnya kak",
        "Mohon maaf mengganggu waktu istirahatnya",
    ];
    return getRandomItem(apologies);
}

function getSafeIntro(customList?: string[]): string {
    if (customList && customList.length > 0) {
        return getRandomItem(customList);
    }

    const intros = [
        "saya mau reminder ada tagihan pembayaran internet yang",
        "mau infokan tagihan internet yang",
        "cuma mau mengingatkan untuk tagihan internet yang",
        "izin mengingatkan tagihan internet yang",
    ];
    return getRandomItem(intros);
}

/**
 * Send payment reminder manually with channel selection
 */
export async function sendPaymentReminderManual(
    invoiceId: string,
    options: {
        sendEmail: boolean;
        sendWhatsApp: boolean;
        reminderType?: 'H-5' | 'H-2' | 'H-0' | 'D+1' | 'D+2' | 'D+5';
        useSafeFlow?: boolean; // New option
    }
): Promise<{ whatsapp: boolean; email: boolean }> {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                user: true,
            },
        });

        if (!invoice || !invoice.user) {
            throw new Error('Invoice or user not found');
        }

        if (invoice.status === 'PAID') {
            console.log(`[Manual Reminder] Invoice ${invoice.invoiceNumber} already paid, skipping reminder`);
            return { whatsapp: false, email: false };
        }

        // Determine reminder type
        let reminderType: 'H-5' | 'H-2' | 'H-0' | 'D+1' | 'D+2' | 'D+5' = options.reminderType || 'H-0';

        if (!options.reminderType) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(invoice.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === 5) {
                reminderType = 'H-5';
            } else if (daysDiff === 2) {
                reminderType = 'H-2';
            } else if (daysDiff === 0) {
                reminderType = 'H-0';
            } else if (daysDiff === -1) {
                reminderType = 'D+1';
            } else if (daysDiff === -2) {
                reminderType = 'D+2';
            } else if (daysDiff <= -5) {
                reminderType = 'D+5';
            }
        }

        const template = await getReminderTemplate(reminderType);
        const daysUntilDue = Math.ceil((invoice.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;

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
            daysUntilDue: daysUntilDue < 0 ? -daysOverdue : daysUntilDue,
        };

        const whatsappMessage = replaceTemplateVariables(template.whatsapp, variables);
        const emailSubject = replaceTemplateVariables(template.email.subject, variables);
        const emailBody = replaceTemplateVariables(template.email.body, variables);

        let emailResult = false;
        let whatsappResult = false;

        if (options.sendEmail && invoice.user.email) {
            emailResult = await sendEmailReminder(invoice.user.email, emailSubject, emailBody);
        }

        // Default to safe flow if not specified
        const useSafeFlow = options.useSafeFlow !== false;

        if (options.sendWhatsApp && invoice.user.phone) {
            if (useSafeFlow) {
                // Fetch Safe Flow Settings
                const safeSettings = await prisma.systemSetting.findMany({
                    where: {
                        key: { in: ['safe_flow_greetings', 'safe_flow_apologies', 'safe_flow_intros', 'safe_flow_body_template'] }
                    }
                });

                const getList = (key: string) => {
                    const val = safeSettings.find(s => s.key === key)?.value;
                    if (!val) return undefined;
                    return val.split('\n').map(s => s.trim()).filter(Boolean);
                };

                const getTemplate = (key: string) => {
                    return safeSettings.find(s => s.key === key)?.value;
                };

                const customGreetings = getList('safe_flow_greetings');
                const customApologies = getList('safe_flow_apologies');
                const customIntros = getList('safe_flow_intros');
                const customBodyTemplate = getTemplate('safe_flow_body_template');

                // STEP 1: Greeting
                const greeting = getSafeGreeting(invoice.user.name, customGreetings);
                await sendWhatsAppReminder(invoice.user.phone, `[TYPING:2]${greeting}`, new Date());

                // STEP 2: Apology (10-30s delay)
                const delay1 = Math.floor(Math.random() * (30 - 10 + 1) + 10);
                const time2 = new Date(Date.now() + delay1 * 1000);
                const apology = getSafeApology(customApologies);
                await sendWhatsAppReminder(invoice.user.phone, `[TYPING:3]${apology}`, time2);

                // STEP 3: Main Content (Step 2 + 5-20s delay)
                const delay2 = Math.floor(Math.random() * (20 - 5 + 1) + 5);
                const time3 = new Date(time2.getTime() + delay2 * 1000);

                // Construct Main Message
                const intro = getSafeIntro(customIntros);

                let mainMessage = customBodyTemplate || `{{intro}} {{invoiceNumber}} sebesar {{amount}} belum terbayar. Batas waktu {{dueDate}}.
                
Mohon segera dilakukan pembayaran ya kak:
{{paymentLink}}

Terima kasih.`;

                // Replace variables in the main message
                mainMessage = mainMessage
                    .replace(/{{intro}}/g, intro)
                    .replace(/{{introSmall}}/g, intro.toLowerCase())
                    .replace(/{{customerName}}/g, variables.customerName)
                    .replace(/{{invoiceNumber}}/g, variables.invoiceNumber)
                    .replace(/{{amount}}/g, variables.amount)
                    .replace(/{{dueDate}}/g, variables.dueDate)
                    .replace(/{{paymentLink}}/g, variables.paymentLink);

                whatsappResult = await sendWhatsAppReminder(invoice.user.phone, `[TYPING:5]${mainMessage}`, time3);
            } else {
                whatsappResult = await sendWhatsAppReminder(invoice.user.phone, whatsappMessage);
            }
        }

        console.log(`[Manual Reminder] Sent ${reminderType} reminder for invoice ${invoice.invoiceNumber}:`, {
            whatsapp: whatsappResult,
            email: emailResult,
            mode: useSafeFlow ? 'SAFE (Multi-step)' : 'STANDARD'
        });

        return {
            whatsapp: whatsappResult,
            email: emailResult,
        };
    } catch (error: any) {
        console.error(`[Manual Reminder] Error sending reminder:`, error);
        return { whatsapp: false, email: false };
    }
}

function getDefaultWhatsAppTemplate(reminderType: 'H-5' | 'H-2' | 'H-0' | 'D+1' | 'D+2' | 'D+5'): string {
    const templates: Record<string, string> = {
        'H-5': 'Halo {{customerName}}, ini adalah pengingat bahwa tagihan {{invoiceNumber}} dengan jumlah {{amount}} akan jatuh tempo pada {{dueDate}}. Silakan lakukan pembayaran melalui link berikut: {{paymentLink}}',
        'H-2': 'Halo {{customerName}}, tagihan {{invoiceNumber}} dengan jumlah {{amount}} akan jatuh tempo dalam 2 hari ({{dueDate}}). Silakan lakukan pembayaran: {{paymentLink}}',
        'H-0': 'Halo {{customerName}}, tagihan {{invoiceNumber}} dengan jumlah {{amount}} jatuh tempo hari ini ({{dueDate}}). Silakan segera lakukan pembayaran: {{paymentLink}}',
        'D+1': 'Halo {{customerName}}, tagihan {{invoiceNumber}} dengan jumlah {{amount}} sudah terlambat 1 hari dari tanggal jatuh tempo ({{dueDate}}). Silakan segera lakukan pembayaran: {{paymentLink}}',
        'D+2': 'Halo {{customerName}}, tagihan {{invoiceNumber}} dengan jumlah {{amount}} sudah terlambat 2 hari. Silakan segera lakukan pembayaran: {{paymentLink}}',
        'D+5': 'Halo {{customerName}}, tagihan {{invoiceNumber}} dengan jumlah {{amount}} sudah terlambat 5 hari. Akun Anda akan diblokir jika tidak melakukan pembayaran segera: {{paymentLink}}',
    };
    return templates[reminderType] || templates['H-0'];
}

function getDefaultEmailSubject(reminderType: 'H-5' | 'H-2' | 'H-0' | 'D+1' | 'D+2' | 'D+5'): string {
    const subjects: Record<string, string> = {
        'H-5': 'Pengingat Pembayaran - Tagihan Akan Jatuh Tempo',
        'H-2': 'Pengingat Pembayaran - Tagihan Akan Jatuh Tempo dalam 2 Hari',
        'H-0': 'Pengingat Pembayaran - Tagihan Jatuh Tempo Hari Ini',
        'D+1': 'Peringatan - Tagihan Sudah Terlambat 1 Hari',
        'D+2': 'Peringatan - Tagihan Sudah Terlambat 2 Hari',
        'D+5': 'Peringatan Terakhir - Tagihan Sudah Terlambat 5 Hari',
    };
    return subjects[reminderType] || subjects['H-0'];
}

function getDefaultEmailBody(reminderType: 'H-5' | 'H-2' | 'H-0' | 'D+1' | 'D+2' | 'D+5'): string {
    const bodies: Record<string, string> = {
        'H-5': '<p>Halo {{customerName}},</p><p>Ini adalah pengingat bahwa tagihan <strong>{{invoiceNumber}}</strong> dengan jumlah <strong>{{amount}}</strong> akan jatuh tempo pada <strong>{{dueDate}}</strong>.</p><p>Silakan lakukan pembayaran melalui link berikut: <a href="{{paymentLink}}">{{paymentLink}}</a></p><p>Terima kasih.</p>',
        'H-2': '<p>Halo {{customerName}},</p><p>Tagihan <strong>{{invoiceNumber}}</strong> dengan jumlah <strong>{{amount}}</strong> akan jatuh tempo dalam 2 hari (<strong>{{dueDate}}</strong>).</p><p>Silakan lakukan pembayaran: <a href="{{paymentLink}}">{{paymentLink}}</a></p>',
        'H-0': '<p>Halo {{customerName}},</p><p>Tagihan <strong>{{invoiceNumber}}</strong> dengan jumlah <strong>{{amount}}</strong> jatuh tempo hari ini (<strong>{{dueDate}}</strong>).</p><p>Silakan segera lakukan pembayaran: <a href="{{paymentLink}}">{{paymentLink}}</a></p>',
        'D+1': '<p>Halo {{customerName}},</p><p>Tagihan <strong>{{invoiceNumber}}</strong> dengan jumlah <strong>{{amount}}</strong> sudah terlambat 1 hari dari tanggal jatuh tempo (<strong>{{dueDate}}</strong>).</p><p>Silakan segera lakukan pembayaran: <a href="{{paymentLink}}">{{paymentLink}}</a></p>',
        'D+2': '<p>Halo {{customerName}},</p><p>Tagihan <strong>{{invoiceNumber}}</strong> dengan jumlah <strong>{{amount}}</strong> sudah terlambat 2 hari.</p><p>Silakan segera lakukan pembayaran: <a href="{{paymentLink}}">{{paymentLink}}</a></p>',
        'D+5': '<p>Halo {{customerName}},</p><p>Tagihan <strong>{{invoiceNumber}}</strong> dengan jumlah <strong>{{amount}}</strong> sudah terlambat 5 hari.</p><p><strong>Akun Anda akan diblokir jika tidak melakukan pembayaran segera.</strong></p><p>Silakan lakukan pembayaran: <a href="{{paymentLink}}">{{paymentLink}}</a></p>',
    };
    return bodies[reminderType] || bodies['H-0'];
}
