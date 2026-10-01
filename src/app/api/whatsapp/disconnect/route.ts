import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolutionApi } from '@/lib/evolution-api';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        // 1. Call Evolution API to Logout
        await evolutionApi.logoutInstance();

        // 2. Update status to DISCONNECTED
        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_status' },
            update: { value: 'DISCONNECTED' },
            create: { key: 'whatsapp_status', value: 'DISCONNECTED' }
        });

        // 3. Clear QR code
        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_qr' },
            update: { value: '' },
            create: { key: 'whatsapp_qr', value: '' }
        });

        return NextResponse.json({
            success: true,
            message: 'WhatsApp berhasil di-disconnect via Evolution API.'
        });
    } catch (error: any) {
        console.error('Error disconnecting WhatsApp:', error);

        // If 404/instance not found, it's effectively disconnected
        if (error.response?.status === 404) {
            await prisma.systemSetting.upsert({
                where: { key: 'whatsapp_status' },
                update: { value: 'DISCONNECTED' },
                create: { key: 'whatsapp_status', value: 'DISCONNECTED' }
            });
            return NextResponse.json({
                success: true,
                message: 'Instance not found, marked as disconnected.'
            });
        }

        return NextResponse.json(
            { success: false, error: 'Gagal disconnect WhatsApp: ' + (error.message || 'Unknown error') },
            { status: 500 }
        );
    }
}
