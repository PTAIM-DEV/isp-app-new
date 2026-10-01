import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const packages = await prisma.servicePackage.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: packages,
        });
    } catch (error: any) {
        console.error('[Packages API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch packages',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

