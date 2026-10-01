import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWelcomeWhatsAppMessage } from '@/lib/whatsapp-welcome';

/**
 * Manually send welcome WhatsApp message to a customer
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, forceResend } = body;

        if (!userId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User ID is required',
                },
                { status: 400 }
            );
        }

        // Get user info
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

        if (!user) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User not found',
                },
                { status: 404 }
            );
        }

        if (!user.phone) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User has no phone number',
                },
                { status: 400 }
            );
        }

        // Check if already sent (before attempting to send)
        // Check both flag and WhatsAppOutgoing log for reliability
        if (!forceResend) {
            // First check flag (faster)
            if (user.welcomeWhatsappSent) {
                return NextResponse.json({
                    success: false,
                    alreadySent: true,
                    message: 'Welcome message sudah pernah dikirim sebelumnya. Gunakan forceResend=true untuk mengirim ulang.',
                });
            }

            // Also check WhatsAppOutgoing log as backup
            const cleanPhone = user.phone.replace(/\D/g, '');
            let jidPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : (cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone);
            const jid = `${jidPhone}@s.whatsapp.net`;

            const existingWelcome = await prisma.whatsAppOutgoing.findFirst({
                where: {
                    jid,
                    content: {
                        contains: 'Selamat datang',
                    },
                    status: 'SENT',
                },
            });

            if (existingWelcome) {
                // Update flag if found in log but flag not set (backfill)
                await prisma.user.update({
                    where: { id: userId },
                    data: {
                        welcomeWhatsappSent: true,
                        welcomeWhatsappSentAt: existingWelcome.createdAt,
                    },
                });
                return NextResponse.json({
                    success: false,
                    alreadySent: true,
                    message: 'Welcome message sudah pernah dikirim sebelumnya. Gunakan forceResend=true untuk mengirim ulang.',
                });
            }
        }

        // Send welcome message (allow resend if forceResend is true)
        try {
            const result = await sendWelcomeWhatsAppMessage(userId, forceResend === true);

            if (result) {
                // Successfully queued the message
                return NextResponse.json({
                    success: true,
                    message: forceResend ? 'Welcome message berhasil dikirim ulang' : 'Welcome message sent successfully',
                    data: {
                        customer: {
                            id: user.id,
                            name: user.name,
                            phone: user.phone,
                        },
                        sales: user.salesPerson ? {
                            name: user.salesPerson.name,
                            phone: user.salesPerson.phone,
                        } : null,
                    },
                });
            } else {
                // Function returned false - check if message was actually queued/sent
                // This can happen if message was sent between our initial check and the send attempt
                const cleanPhone = user.phone.replace(/\D/g, '');
                let jidPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.slice(1) : (cleanPhone.startsWith('62') ? cleanPhone : '62' + cleanPhone);
                const jid = `${jidPhone}@s.whatsapp.net`;

                // Check WhatsAppOutgoing log first (more reliable)
                const existingWelcome = await prisma.whatsAppOutgoing.findFirst({
                    where: {
                        jid,
                        content: {
                            contains: 'Selamat datang',
                        },
                        status: { in: ['PENDING', 'SENT'] },
                    },
                    orderBy: { createdAt: 'desc' },
                });

                if (existingWelcome) {
                    // Message was queued or sent, update flag and return success
                    try {
                        await prisma.user.update({
                            where: { id: userId },
                            data: {
                                welcomeWhatsappSent: true,
                                welcomeWhatsappSentAt: existingWelcome.createdAt,
                            },
                        });
                    } catch (updateError: any) {
                        // If field doesn't exist yet, just log and continue
                        console.warn('[Admin Send Welcome] Could not update welcomeWhatsappSent flag:', updateError.message);
                    }

                    return NextResponse.json({
                        success: true,
                        message: existingWelcome.status === 'SENT' ? 'Welcome message sudah terkirim' : 'Welcome message sudah di-queue',
                        data: {
                            customer: {
                                id: user.id,
                                name: user.name,
                                phone: user.phone,
                            },
                            sales: user.salesPerson ? {
                                name: user.salesPerson.name,
                                phone: user.salesPerson.phone,
                            } : null,
                        },
                    });
                }

                // Re-check user flag (might have been updated by worker)
                // Use try-catch to handle case where field doesn't exist in Prisma client yet
                try {
                    const updatedUser = await prisma.user.findUnique({
                        where: { id: userId },
                    });

                    // Check flag using type assertion (field exists in DB but maybe not in generated client)
                    const welcomeSent = (updatedUser as any)?.welcomeWhatsappSent;
                    if (welcomeSent) {
                        // Flag was set, message was sent
                        return NextResponse.json({
                            success: true,
                            message: 'Welcome message sudah terkirim',
                            alreadySent: true,
                            data: {
                                customer: {
                                    id: user.id,
                                    name: user.name,
                                    phone: user.phone,
                                },
                                sales: user.salesPerson ? {
                                    name: user.salesPerson.name,
                                    phone: user.salesPerson.phone,
                                } : null,
                            },
                        });
                    }
                } catch (flagError: any) {
                    // If we can't check flag, just continue to error
                    console.warn('[Admin Send Welcome] Could not check welcomeWhatsappSent flag:', flagError.message);
                }

                // Truly failed to send
                console.error('[Admin Send Welcome] Failed to send welcome message - no queue entry found');
                return NextResponse.json(
                    {
                        success: false,
                        error: 'Failed to send welcome message. Please try again.',
                    },
                    { status: 500 }
                );
            }
        } catch (sendError: any) {
            console.error('[Admin Send Welcome] Error during send:', sendError);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to send welcome message',
                    message: sendError.message || 'Unknown error',
                },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('[Admin Send Welcome] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to send welcome message',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

