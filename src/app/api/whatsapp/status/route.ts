import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { evolutionApi } from '@/lib/evolution-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/status
 * SSE endpoint that ONLY reports status - NO auto-connect
 * User must manually click "Connect" button to initiate connection
 */
export async function GET(request: NextRequest) {
    const headers = new Headers();
    headers.set('Content-Type', 'text/event-stream');
    headers.set('Cache-Control', 'no-cache, no-transform');
    headers.set('Connection', 'keep-alive');
    headers.set('X-Accel-Buffering', 'no');

    // Track if stream is still open
    let isStreamClosed = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Safe enqueue that checks if stream is closed
            const safeEnqueue = (data: string) => {
                if (!isStreamClosed) {
                    try {
                        controller.enqueue(encoder.encode(data));
                    } catch (e) {
                        // Stream was closed
                        isStreamClosed = true;
                    }
                }
            };

            const sendData = async () => {
                if (isStreamClosed) return;

                try {
                    const statusData = await evolutionApi.fetchInstanceStatus();
                    const state = statusData?.instance?.state;

                    let status = 'DISCONNECTED';
                    let qrCode: string | null = null;

                    if (state === 'open') {
                        status = 'CONNECTED';
                        await prisma.systemSetting.upsert({
                            where: { key: 'whatsapp_qr' },
                            update: { value: '' },
                            create: { key: 'whatsapp_qr', value: '' }
                        }).catch(() => { });
                    } else if (state === 'connecting') {
                        status = 'CONNECTING';
                        const savedQr = await prisma.systemSetting.findUnique({
                            where: { key: 'whatsapp_qr' }
                        });
                        if (savedQr?.value) {
                            status = 'SCAN_QR';
                            qrCode = savedQr.value;
                        }
                    } else if (state === 'close') {
                        const savedQr = await prisma.systemSetting.findUnique({
                            where: { key: 'whatsapp_qr' }
                        });
                        if (savedQr?.value) {
                            status = 'SCAN_QR';
                            qrCode = savedQr.value;
                        } else {
                            status = 'DISCONNECTED';
                        }
                    } else if (state === 'NOT_FOUND') {
                        status = 'NOT_INITIALIZED';
                    }

                    // Persist status
                    await prisma.systemSetting.upsert({
                        where: { key: 'whatsapp_status' },
                        update: { value: status },
                        create: { key: 'whatsapp_status', value: status }
                    }).catch(() => { });

                    const data = JSON.stringify({ status, qrCode, timestamp: Date.now() });
                    safeEnqueue(`data: ${data}\n\n`);

                } catch (error: any) {
                    const isConnectionError = error.code === 'EAI_AGAIN' ||
                        error.code === 'ECONNREFUSED' ||
                        error.code === 'ENOTFOUND' ||
                        error.message?.includes('getaddrinfo');

                    // Don't log "Controller is already closed" errors
                    if (!error.message?.includes('Controller')) {
                        console.error(`[WhatsApp Status] Error: ${error.message}`);
                    }

                    const errorData = JSON.stringify({
                        status: isConnectionError ? 'API_UNREACHABLE' : 'DISCONNECTED',
                        qrCode: null,
                        error: isConnectionError
                            ? 'Evolution API tidak dapat dijangkau'
                            : null,
                        timestamp: Date.now()
                    });
                    safeEnqueue(`data: ${errorData}\n\n`);
                }
            };

            // Schedule polling
            const schedulePoll = () => {
                if (isStreamClosed) return;

                timeoutId = setTimeout(async () => {
                    if (isStreamClosed) return;
                    await sendData();
                    schedulePoll();
                }, 5000);
            };

            // Send initial data
            await sendData();
            schedulePoll();

            // Cleanup on disconnect
            request.signal.addEventListener('abort', () => {
                isStreamClosed = true;
                if (timeoutId) clearTimeout(timeoutId);
                try {
                    controller.close();
                } catch (e) {
                    // Already closed
                }
            });
        },
        cancel() {
            isStreamClosed = true;
            if (timeoutId) clearTimeout(timeoutId);
        }
    });

    return new Response(stream, { headers });
}
