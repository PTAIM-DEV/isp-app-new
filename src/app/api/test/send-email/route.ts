import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

/**
 * Test endpoint to send email
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { to, subject, message } = body;

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Email dari ISP Management System</h1>
        </div>
        <div class="content">
            <p>Halo,</p>
            <p>Ini adalah email test dari sistem ISP Management.</p>
            <p><strong>Pesan:</strong> ${message || 'Email test berhasil dikirim dari sistem Linux.'}</p>
            <p>Jika Anda menerima email ini, berarti konfigurasi SMTP sudah benar dan email dapat dikirim dengan baik.</p>
            <div class="footer">
                <p>Pesan ini dikirim otomatis dari sistem ISP Management.</p>
                <p>Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        const result = await sendEmail({
            to: to || 'indra@verinux.com',
            subject: subject || 'Test Email dari ISP Management System',
            html: emailHtml,
        });

        if (result) {
            return NextResponse.json({
                success: true,
                message: 'Email berhasil dikirim',
                to: to || 'indra@verinux.com',
                timestamp: new Date().toISOString(),
            });
        } else {
            return NextResponse.json({
                success: false,
                message: 'Email gagal dikirim. Cek konfigurasi SMTP di .env',
                error: 'SMTP not configured or failed to send',
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('[Test Send Email] Error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to send email', 
                message: error.message 
            },
            { status: 500 }
        );
    }
}

/**
 * GET endpoint untuk test cepat
 */
export async function GET() {
    try {
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Test Email dari ISP Management System</h1>
        </div>
        <div class="content">
            <p>Halo Indra,</p>
            <p>Ini adalah email test dari sistem ISP Management yang berjalan di Linux.</p>
            <p>Jika Anda menerima email ini, berarti konfigurasi SMTP sudah benar dan email dapat dikirim dengan baik dari sistem Linux.</p>
            <div class="footer">
                <p>Pesan ini dikirim otomatis dari sistem ISP Management.</p>
                <p>Timestamp: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}</p>
            </div>
        </div>
    </div>
</body>
</html>
        `;

        try {
            const result = await sendEmail({
                to: 'indra@verinux.com',
                subject: 'Test Email dari ISP Management System (Linux)',
                html: emailHtml,
            });

            if (result) {
                return NextResponse.json({
                    success: true,
                    message: 'Email berhasil dikirim ke indra@verinux.com',
                    timestamp: new Date().toISOString(),
                });
            } else {
                return NextResponse.json({
                    success: false,
                    message: 'Email gagal dikirim. Cek konfigurasi SMTP di .env',
                    error: 'SMTP not configured or failed to send',
                    check: {
                        SMTP_HOST: process.env.SMTP_HOST || 'not set',
                        SMTP_PORT: process.env.SMTP_PORT || 'not set',
                        SMTP_USER: process.env.SMTP_USER ? 'set' : 'not set',
                        SMTP_PASS: process.env.SMTP_PASS ? 'set' : 'not set',
                        SMTP_FROM: process.env.SMTP_FROM || 'not set',
                    },
                }, { status: 500 });
            }
        } catch (emailError: any) {
            console.error('[Test Send Email] Detailed error:', emailError);
            return NextResponse.json({
                success: false,
                message: 'Email gagal dikirim',
                error: emailError.message || 'Unknown error',
                details: emailError.toString(),
                check: {
                    SMTP_HOST: process.env.SMTP_HOST || 'not set',
                    SMTP_PORT: process.env.SMTP_PORT || 'not set',
                    SMTP_USER: process.env.SMTP_USER ? 'set' : 'not set',
                    SMTP_PASS: process.env.SMTP_PASS ? 'set' : 'not set',
                    SMTP_FROM: process.env.SMTP_FROM || 'not set',
                },
            }, { status: 500 });
        }
    } catch (error: any) {
        console.error('[Test Send Email] Error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to send email', 
                message: error.message,
                check: {
                    SMTP_HOST: process.env.SMTP_HOST || 'not set',
                    SMTP_PORT: process.env.SMTP_PORT || 'not set',
                    SMTP_USER: process.env.SMTP_USER ? 'set' : 'not set',
                    SMTP_PASS: process.env.SMTP_PASS ? 'set' : 'not set',
                    SMTP_FROM: process.env.SMTP_FROM || 'not set',
                },
            },
            { status: 500 }
        );
    }
}

