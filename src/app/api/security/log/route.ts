import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ip, path, method, userAgent } = body;

        // Check blacklist first
        const isBlocked = await prisma.blacklist.findUnique({
            where: { ip },
        });

        if (isBlocked) {
            // If blocked, we might want to return 403, but this is an async log call.
            // The middleware should have blocked it if we could check DB there.
            // Since we can't easily check DB in middleware, we rely on this log to potentially identify and block for NEXT time.
            // For now, just log.
        }

        await prisma.accessLog.create({
            data: {
                ip,
                path,
                method,
                status: 200, // We assume 200 if it passed middleware, or we could pass status from middleware if possible (hard)
                userAgent,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        // console.error('Log error:', error);
        return NextResponse.json({ error: 'Log failed' }, { status: 500 });
    }
}
