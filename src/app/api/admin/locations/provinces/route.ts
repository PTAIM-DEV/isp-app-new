import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const provinces = await prisma.province.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: provinces,
        });
    } catch (error: any) {
        console.error('[Provinces API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch provinces',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

