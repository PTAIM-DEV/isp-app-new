import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendWelcomeEmailMessage } from '@/lib/email-welcome';

/**
 * Manually send welcome email message to a customer
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

        if (!user.email) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'User has no email address',
                },
                { status: 400 }
            );
        }

        // Check if already sent (before attempting to send)
        if (!forceResend && user.welcomeEmailSent) {
            return NextResponse.json({
                success: false,
                alreadySent: true,
                message: 'Welcome email sudah pernah dikirim sebelumnya. Gunakan forceResend=true untuk mengirim ulang.',
            });
        }

        // Send welcome email (allow resend if forceResend is true)
        const result = await sendWelcomeEmailMessage(userId, forceResend === true);

        if (result) {
            return NextResponse.json({
                success: true,
                message: forceResend ? 'Welcome email berhasil dikirim ulang' : 'Welcome email sent successfully',
                data: {
                    customer: {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                    },
                    sales: user.salesPerson ? {
                        name: user.salesPerson.name,
                        phone: user.salesPerson.phone,
                    } : null,
                },
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Failed to send welcome email',
                },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('[Admin Send Welcome Email] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to send welcome email',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

