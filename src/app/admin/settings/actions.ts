'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function updateAdminCredentials(formData: FormData) {
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    if (!username || !password) {
        return { success: false, error: 'Username and password are required' };
    }

    try {
        await prisma.systemSetting.upsert({
            where: { key: 'admin_username' },
            update: { value: username },
            create: { key: 'admin_username', value: username, description: 'Admin Username' }
        });

        await prisma.systemSetting.upsert({
            where: { key: 'admin_password' },
            update: { value: password },
            create: { key: 'admin_password', value: password, description: 'Admin Password' }
        });

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Update credentials error:', error);
        return { success: false, error: 'Failed to update credentials' };
    }
}

export async function saveSettings(formData: FormData) {
    const settings = [
        'MIKROTIK_HOST',
        'MIKROTIK_PORT',
        'MIKROTIK_USER',
        'MIKROTIK_PASS',
        'xendit_admin_fee'
    ];

    try {
        for (const key of settings) {
            const value = formData.get(key) as string;
            if (value !== null) {
                await prisma.systemSetting.upsert({
                    where: { key },
                    create: { key, value },
                    update: { value },
                });
            }
        }

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Save settings error:', error);
        return { success: false, error: 'Gagal menyimpan ke database.' };
    }
}

export async function saveTerms(formData: FormData) {
    try {
        const content = formData.get('terms_content') as string;

        await prisma.systemSetting.upsert({
            where: { key: 'terms_and_conditions' },
            create: {
                key: 'terms_and_conditions',
                value: content,
                description: 'Syarat dan Ketentuan Layanan'
            },
            update: { value: content },
        });

        revalidatePath('/admin/settings');
        revalidatePath('/register'); // Revalidate register page too
        return { success: true };
    } catch (error) {
        console.error('Save terms error:', error);
        return { success: false, error: 'Gagal menyimpan S&K.' };
    }
}

// ✅ UPDATE: Reminder templates aligned with payment-reminder-manual.ts keys
export async function updateReminderTemplates(data: {
    h5Whatsapp: string; h5EmailSubject: string; h5EmailBody: string;
    h2Whatsapp: string; h2EmailSubject: string; h2EmailBody: string;
    h0Whatsapp: string; h0EmailSubject: string; h0EmailBody: string;
    d1Whatsapp: string; d1EmailSubject: string; d1EmailBody: string;
    d2Whatsapp: string; d2EmailSubject: string; d2EmailBody: string;
    d5Whatsapp: string; d5EmailSubject: string; d5EmailBody: string;
    // New Safe Flow Fields
    safeFlowGreetings: string;
    safeFlowApologies: string;
    safeFlowIntros: string;
    safeFlowBody: string;
}) {
    try {
        const templates = [
            // H-5
            { key: 'reminder_whatsapp_H-5', value: data.h5Whatsapp, description: 'Template WhatsApp Reminder H-5' },
            { key: 'reminder_email_subject_H-5', value: data.h5EmailSubject, description: 'Subject Email Reminder H-5' },
            { key: 'reminder_email_body_H-5', value: data.h5EmailBody, description: 'Body Email Reminder H-5' },

            // H-2
            { key: 'reminder_whatsapp_H-2', value: data.h2Whatsapp, description: 'Template WhatsApp Reminder H-2' },
            { key: 'reminder_email_subject_H-2', value: data.h2EmailSubject, description: 'Subject Email Reminder H-2' },
            { key: 'reminder_email_body_H-2', value: data.h2EmailBody, description: 'Body Email Reminder H-2' },

            // H-0
            { key: 'reminder_whatsapp_H-0', value: data.h0Whatsapp, description: 'Template WhatsApp Reminder H-0' },
            { key: 'reminder_email_subject_H-0', value: data.h0EmailSubject, description: 'Subject Email Reminder H-0' },
            { key: 'reminder_email_body_H-0', value: data.h0EmailBody, description: 'Body Email Reminder H-0' },

            // D+1
            { key: 'reminder_whatsapp_D_plus_1', value: data.d1Whatsapp, description: 'Template WhatsApp Reminder D+1' },
            { key: 'reminder_email_subject_D_plus_1', value: data.d1EmailSubject, description: 'Subject Email Reminder D+1' },
            { key: 'reminder_email_body_D_plus_1', value: data.d1EmailBody, description: 'Body Email Reminder D+1' },

            // D+2
            { key: 'reminder_whatsapp_D_plus_2', value: data.d2Whatsapp, description: 'Template WhatsApp Reminder D+2' },
            { key: 'reminder_email_subject_D_plus_2', value: data.d2EmailSubject, description: 'Subject Email Reminder D+2' },
            { key: 'reminder_email_body_D_plus_2', value: data.d2EmailBody, description: 'Body Email Reminder D+2' },

            // D+5
            { key: 'reminder_whatsapp_D_plus_5', value: data.d5Whatsapp, description: 'Template WhatsApp Reminder D+5' },
            { key: 'reminder_email_subject_D_plus_5', value: data.d5EmailSubject, description: 'Subject Email Reminder D+5' },
            { key: 'reminder_email_body_D_plus_5', value: data.d5EmailBody, description: 'Body Email Reminder D+5' },

            // Safe Flow Settings
            { key: 'safe_flow_greetings', value: data.safeFlowGreetings, description: 'Safe Flow Greetings List' },
            { key: 'safe_flow_apologies', value: data.safeFlowApologies, description: 'Safe Flow Apologies List' },
            { key: 'safe_flow_intros', value: data.safeFlowIntros, description: 'Safe Flow Intros List' },
            { key: 'safe_flow_body_template', value: data.safeFlowBody, description: 'Safe Flow Main Message Body Template' },
        ];

        for (const template of templates) {
            await prisma.systemSetting.upsert({
                where: { key: template.key },
                create: template,
                update: { value: template.value },
            });
        }

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Update reminder templates error:', error);
        return { success: false, error: 'Gagal menyimpan template reminder.' };
    }
}

export async function updateWelcomeTemplate(data: {
    welcomeWhatsapp: string;
}) {
    try {
        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_welcome_message' },
            create: {
                key: 'whatsapp_welcome_message',
                value: data.welcomeWhatsapp,
                description: 'Template WhatsApp Welcome Message untuk pelanggan baru',
            },
            update: { value: data.welcomeWhatsapp },
        });

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Update welcome template error:', error);
        return { success: false, error: 'Gagal menyimpan template welcome.' };
    }
}

export async function updateSalesTemplate(invoiceTemplate: string, statusInquiryTemplate?: string) {
    try {
        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_sales_invoice_template' },
            create: {
                key: 'whatsapp_sales_invoice_template',
                value: invoiceTemplate,
                description: 'Template WhatsApp Notifikasi Sales Invoice',
            },
            update: { value: invoiceTemplate },
        });

        if (statusInquiryTemplate !== undefined) {
            await prisma.systemSetting.upsert({
                where: { key: 'whatsapp_sales_status_inquiry_template' },
                create: {
                    key: 'whatsapp_sales_status_inquiry_template',
                    value: statusInquiryTemplate,
                    description: 'Template WhatsApp Inquiry Status Pelanggan ke Sales',
                },
                update: { value: statusInquiryTemplate },
            });
        }

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Update sales template error:', error);
        return { success: false, error: 'Gagal menyimpan template sales.' };
    }
}

export async function updatePaymentTemplates(data: {
    customerTemplate: string;
    salesTemplate: string;
}) {
    try {
        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_payment_success_template' },
            create: {
                key: 'whatsapp_payment_success_template',
                value: data.customerTemplate,
                description: 'Template WhatsApp Pembayaran Berhasil (Customer)',
            },
            update: { value: data.customerTemplate },
        });

        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_sales_payment_success_template' },
            create: {
                key: 'whatsapp_sales_payment_success_template',
                value: data.salesTemplate,
                description: 'Template WhatsApp Pembayaran Berhasil (Sales)',
            },
            update: { value: data.salesTemplate },
        });

        revalidatePath('/admin/settings');
        return { success: true };
    } catch (error) {
        console.error('Update payment templates error:', error);
        return { success: false, error: 'Gagal menyimpan template pembayaran.' };
    }
}
