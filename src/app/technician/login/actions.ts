'use server';

import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { redirect } from 'next/navigation';

// Generate 6-digit OTP
function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function sendTechnicianOTP(phone: string) {
    try {
        // Validate phone format
        const cleanPhone = phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('62')) {
            return { success: false, error: 'Nomor harus diawali dengan 62 (contoh: 628123456789)' };
        }

        // Check if technician exists
        const technician = await prisma.user.findFirst({
            where: {
                phone: cleanPhone,
                role: 'TECHNICIAN'
            },
        });

        if (!technician) {
            return { success: false, error: 'Teknisi tidak ditemukan.' };
        }

        if (technician.status !== 'ACTIVE') {
            return { success: false, error: 'Akun teknisi tidak aktif.' };
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Save OTP to database
        await prisma.systemSetting.upsert({
            where: { key: `technician_otp_${cleanPhone}` },
            update: {
                value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString() }),
                description: 'OTP for technician login'
            },
            create: {
                key: `technician_otp_${cleanPhone}`,
                value: JSON.stringify({ otp, expiresAt: expiresAt.toISOString() }),
                description: 'OTP for technician login'
            }
        });

        // Send OTP via WhatsApp
        const jid = `${cleanPhone}@s.whatsapp.net`;
        const message = `Kode OTP Anda untuk login sebagai teknisi: *${otp}*\n\nKode berlaku selama 5 menit.\nJangan bagikan kode ini kepada siapapun.`;

        await prisma.whatsAppOutgoing.create({
            data: {
                jid,
                content: message,
                status: 'PENDING'
            }
        });

        console.log(`✓ Technician OTP generated and queued for ${cleanPhone}: ${otp}`);
        return { success: true };
    } catch (error: any) {
        console.error('Send technician OTP error:', error);
        return { success: false, error: 'Gagal mengirim OTP' };
    }
}

export async function loginTechnician(phone: string, password?: string, otp?: string) {
    try {
        const cleanPhone = phone.replace(/\D/g, '');

        // Find technician
        const technician = await prisma.user.findFirst({
            where: {
                phone: cleanPhone,
                role: 'TECHNICIAN'
            },
        });

        if (!technician) {
            return { success: false, error: 'Teknisi tidak ditemukan.' };
        }

        if (technician.status !== 'ACTIVE') {
            return { success: false, error: 'Akun teknisi tidak aktif.' };
        }

        // Hybrid authentication: Password OR OTP
        let authenticated = false;

        // Method 1: Password authentication
        if (password && technician.password) {
            const passwordMatch = await bcrypt.compare(password, technician.password);
            if (passwordMatch) {
                authenticated = true;
            }
        }

        // Method 2: OTP authentication
        if (!authenticated && otp) {
            // DEVELOPMENT BYPASS: Accept 123456 as valid OTP
            if (otp === '123456') {
                console.log('✓ Development bypass OTP accepted for technician:', cleanPhone);
                authenticated = true;
            } else {
                // Get stored OTP
                const otpData = await prisma.systemSetting.findUnique({
                    where: { key: `technician_otp_${cleanPhone}` }
                });

                if (otpData) {
                    const { otp: storedOTP, expiresAt } = JSON.parse(otpData.value);

                    // Check if expired
                    if (new Date() <= new Date(expiresAt)) {
                        // Verify OTP
                        if (otp === storedOTP) {
                            authenticated = true;
                            // Delete used OTP
                            await prisma.systemSetting.delete({
                                where: { key: `technician_otp_${cleanPhone}` }
                            });
                        }
                    }
                }
            }
        }

        if (!authenticated) {
            return { success: false, error: 'Password atau OTP salah.' };
        }

        // Create session
        const cookieStore = await cookies();
        const sessionToken = `${technician.id}_${Date.now()}`;

        cookieStore.set('technician_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7, // 7 days
            path: '/',
        });

        // Store session in database (optional, for better security)
        await prisma.systemSetting.upsert({
            where: { key: `technician_session_${technician.id}` },
            update: {
                value: JSON.stringify({ token: sessionToken, createdAt: new Date().toISOString() }),
                description: 'Technician session token'
            },
            create: {
                key: `technician_session_${technician.id}`,
                value: JSON.stringify({ token: sessionToken, createdAt: new Date().toISOString() }),
                description: 'Technician session token'
            }
        });

        return { success: true, technician: { id: technician.id, name: technician.name } };
    } catch (error) {
        console.error('Login technician error:', error);
        return { success: false, error: 'Gagal login' };
    }
}

export async function logoutTechnician() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('technician_session');

        if (session) {
            cookieStore.delete('technician_session');
        }

        redirect('/technician/login');
    } catch (error) {
        console.error('Logout technician error:', error);
        redirect('/technician/login');
    }
}

export async function getCurrentTechnician() {
    try {
        const cookieStore = await cookies();
        const session = cookieStore.get('technician_session');

        if (!session) {
            return null;
        }

        // Find technician by session token
        const sessions = await prisma.systemSetting.findMany({
            where: {
                key: { startsWith: 'technician_session_' }
            }
        });

        for (const sessionData of sessions) {
            try {
                const { token } = JSON.parse(sessionData.value);
                if (token === session.value) {
                    const technicianId = sessionData.key.replace('technician_session_', '');
                    const technician = await prisma.user.findUnique({
                        where: { id: technicianId },
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                            status: true,
                            photoUrl: true,
                            role: true,
                        }
                    });
                    return technician;
                }
            } catch (e) {
                // Skip invalid session data
            }
        }

        return null;
    } catch (error) {
        console.error('Get current technician error:', error);
        return null;
    }
}
