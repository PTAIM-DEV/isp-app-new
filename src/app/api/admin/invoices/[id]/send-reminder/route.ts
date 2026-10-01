import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPaymentReminderManual } from '@/lib/payment-reminder-manual';

/**
 * Manually send payment reminder for an invoice
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { sendEmail, sendWhatsApp, reminderType } = body;

        if (!sendEmail && !sendWhatsApp) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Please select at least one delivery method',
                },
                { status: 400 }
            );
        }

        // Get invoice with user info
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                user: true,
            },
        });

        if (!invoice) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invoice not found',
                },
                { status: 404 }
            );
        }

        // Send reminder using manual function that respects channel selection
        const result = await sendPaymentReminderManual(id, {
            sendEmail,
            sendWhatsApp,
            reminderType: reminderType as 'H-5' | 'H-2' | 'H-0' | 'D+1' | 'D+2' | 'D+5' | undefined,
        });

        const emailResult = result.email;
        const whatsappResult = result.whatsapp;

        // Determine reminder type for record
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        const invoiceDueDate = new Date(invoice.dueDate);
        invoiceDueDate.setHours(0, 0, 0, 0);
        const daysDiff = Math.floor((invoiceDueDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));

        let finalReminderType: 'H-5' | 'H-2' | 'H-0' | 'D+1' | 'D+2' | 'D+5' = reminderType as any || 'H-0';
        
        if (!reminderType) {
            if (daysDiff === 5) {
                finalReminderType = 'H-5';
            } else if (daysDiff === 2) {
                finalReminderType = 'H-2';
            } else if (daysDiff === 0) {
                finalReminderType = 'H-0';
            } else if (daysDiff === -1) {
                finalReminderType = 'D+1';
            } else if (daysDiff === -2) {
                finalReminderType = 'D+2';
            } else if (daysDiff <= -5) {
                finalReminderType = 'D+5';
            }
        }

        // Create reminder record
        // Note: emailSent and whatsappSent fields may not exist if migration hasn't been run yet
        try {
            await prisma.scheduledReminder.create({
                data: {
                    invoiceId: id,
                    reminderType: finalReminderType,
                    scheduledAt: new Date(),
                    status: (emailResult || whatsappResult) ? 'SENT' : 'FAILED',
                    sentAt: (emailResult || whatsappResult) ? new Date() : null,
                    emailSent: emailResult,
                    whatsappSent: whatsappResult,
                },
            });
        } catch (error: any) {
            // Fallback if emailSent/whatsappSent fields don't exist yet
            if (error.message && error.message.includes('Unknown argument')) {
                console.warn('[Admin Send Reminder] Channel tracking fields not available, creating record without them');
                await prisma.scheduledReminder.create({
                    data: {
                        invoiceId: id,
                        reminderType: finalReminderType,
                        scheduledAt: new Date(),
                        status: (emailResult || whatsappResult) ? 'SENT' : 'FAILED',
                        sentAt: (emailResult || whatsappResult) ? new Date() : null,
                    },
                });
            } else {
                throw error;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Reminder sent successfully',
            data: {
                invoice: {
                    id: invoice.id,
                    invoiceNumber: invoice.invoiceNumber,
                },
                customer: {
                    name: invoice.user.name,
                    email: invoice.user.email,
                    phone: invoice.user.phone,
                },
                reminder: {
                    type: finalReminderType,
                    email: emailResult,
                    whatsapp: whatsappResult,
                },
            },
        });
    } catch (error: any) {
        console.error('[Admin Send Reminder] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to send reminder',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

