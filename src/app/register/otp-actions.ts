'use server';

import { prisma } from '@/lib/prisma';

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendOTP(phone: string) {
    try {
        // Validate phone format (should start with 62 for Indonesia)
        const cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('62')) {
            return { success: false, error: 'Nomor harus diawali dengan 62 (contoh: 628123456789)' };
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save OTP to database
        await prisma.systemSetting.upsert({
            where: { key: `otp_${cleanPhone}` },
            update: {
                value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString() }),
                description: 'OTP for registration'
            },
            create: {
                key: `otp_${cleanPhone}`,
                value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString() }),
                description: 'OTP for registration'
            }
        });

        // Send OTP via WhatsApp
        const jid = `${cleanPhone}@s.whatsapp.net`;
        const message = `Kode OTP Anda untuk registrasi: *${otp}*\n\nKode berlaku selama 5 menit.\nJangan bagikan kode ini kepada siapapun.`;

        await prisma.whatsAppOutgoing.create({
            data: {
                jid,
                content: message,
                status: 'PENDING'
            }
        });

        console.log(`✓ OTP generated and queued for ${cleanPhone}: ${otp}`);
        return { success: true };
    } catch (error: any) {
        console.error('Send OTP error:', error);
        const errorMessage = error?.message || 'Gagal mengirim OTP';
        // Check if it's a database error
        if (errorMessage.includes('does not exist') || errorMessage.includes('relation')) {
            return { success: false, error: 'Database error: Tabel WhatsAppOutgoing tidak ditemukan. Silakan hubungi administrator.' };
        }
        return { success: false, error: `Gagal mengirim OTP: ${errorMessage}` };
    }
}

export async function verifyOTP(phone: string, otp: string) {
    try {
        // DEVELOPMENT BYPASS: Accept 123456 as valid OTP
        if (otp === '123456') {
            console.log('✓ Development bypass OTP accepted for:', phone);
            return { success: true };
        }

        const cleanPhone = phone.replace(/\D/g, '');

        // Get stored OTP
        const otpData = await prisma.systemSetting.findUnique({
            where: { key: `otp_${cleanPhone}` }
        });

        if (!otpData) {
            return { success: false, error: 'OTP tidak ditemukan. Silakan kirim ulang.' };
        }

        const { otp: storedOTP, expiresAt } = JSON.parse(otpData.value);

        // Check if expired
        if (new Date() > new Date(expiresAt)) {
            return { success: false, error: 'OTP sudah kadaluarsa. Silakan kirim ulang.' };
        }

        // Verify OTP
        if (otp !== storedOTP) {
            return { success: false, error: 'Kode OTP salah' };
        }

        // Delete used OTP
        await prisma.systemSetting.delete({
            where: { key: `otp_${cleanPhone}` }
        });

        return { success: true };
    } catch (error) {
        console.error('Verify OTP error:', error);
        return { success: false, error: 'Gagal memverifikasi OTP' };
    }
}
