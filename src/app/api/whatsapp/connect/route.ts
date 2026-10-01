import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolutionApi } from '@/lib/evolution-api';

export const dynamic = 'force-dynamic';

// Helper to wait
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * POST /api/whatsapp/connect
 * Manually initiate WhatsApp connection and get QR code with retry logic
 */
export async function POST() {
    try {
        console.log('[WhatsApp Connect] Manual connection requested');

        // 1. Check current status
        const statusData = await evolutionApi.fetchInstanceStatus();
        const state = statusData?.instance?.state;

        // If already connected, return success
        if (state === 'open') {
            return NextResponse.json({
                success: true,
                status: 'CONNECTED',
                message: 'Already connected'
            });
        }

        // 2. Check for hung instance (connecting state)
        if (state === 'connecting') {
            console.log('[WhatsApp Connect] Instance is in connecting state (HUNG). Cleaning up...');
            try {
                await evolutionApi.deleteInstance();
                // Wait a bit for the cleanup to propagate
                await sleep(2000);
            } catch (cleanupError) {
                console.error('[WhatsApp Connect] Cleanup error:', cleanupError);
                // Continue anyway, maybe it was already gone
            }
        }

        // 2. Create instance if not exists or if it was just deleted
        if (state === 'NOT_FOUND' || state === 'connecting') {
            console.log('[WhatsApp Connect] Instance not found or just cleaned up, creating...');
            const createResult = await evolutionApi.createInstance();

            // Check if QR code was returned immediately
            if (createResult?.qrcode?.base64) {
                await saveQrCode(createResult.qrcode.base64);
                return NextResponse.json({
                    success: true,
                    status: 'SCAN_QR',
                    qrCode: createResult.qrcode.base64,
                    message: 'QR code generated. Please scan with WhatsApp.'
                });
            }
        }

        // 3. Poll for QR code with retries (like Chiquita)
        console.log('[WhatsApp Connect] Polling for QR code...');

        let retries = 10;
        let qrCode: string | null = null;

        while (retries > 0 && !qrCode) {
            try {
                const connectData = await evolutionApi.connectInstance();

                // Check various possible response formats
                if (connectData?.base64) {
                    qrCode = connectData.base64;
                } else if (connectData?.qrcode?.base64) {
                    qrCode = connectData.qrcode.base64;
                } else if (connectData?.count === 0) {
                    // QR not ready yet, wait and retry
                    console.log(`[WhatsApp Connect] QR not ready (count: 0). Retrying... (${retries} attempts left)`);
                    await sleep(2000);
                    retries--;
                    continue;
                }

                if (qrCode) {
                    await saveQrCode(qrCode);
                    return NextResponse.json({
                        success: true,
                        status: 'SCAN_QR',
                        qrCode,
                        message: 'QR code generated. Please scan with WhatsApp.'
                    });
                }
            } catch (error: any) {
                console.error(`[WhatsApp Connect] Retry error: ${error.message}`);
                retries--;
                await sleep(1000);
            }
        }

        // After all retries, check if instance is connecting (QR might come via webhook)
        const finalStatus = await evolutionApi.fetchInstanceStatus();
        if (finalStatus?.instance?.state === 'connecting') {
            return NextResponse.json({
                success: true,
                status: 'CONNECTING',
                qrCode: null,
                message: 'Connection initiated. QR code will appear shortly.'
            });
        }

        return NextResponse.json({
            success: false,
            status: 'ERROR',
            qrCode: null,
            error: 'Failed to get QR code after multiple attempts'
        }, { status: 500 });

    } catch (error: any) {
        console.error('[WhatsApp Connect] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message || 'Failed to connect',
                status: 'ERROR'
            },
            { status: 500 }
        );
    }
}

async function saveQrCode(qrCode: string) {
    await prisma.systemSetting.upsert({
        where: { key: 'whatsapp_qr' },
        update: { value: qrCode },
        create: { key: 'whatsapp_qr', value: qrCode }
    });

    await prisma.systemSetting.upsert({
        where: { key: 'whatsapp_status' },
        update: { value: 'SCAN_QR' },
        create: { key: 'whatsapp_status', value: 'SCAN_QR' }
    });
}
