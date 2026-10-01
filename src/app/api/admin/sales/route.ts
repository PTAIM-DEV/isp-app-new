import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const sales = await prisma.user.findMany({
            where: {
                role: 'SALES' as const,
                status: 'ACTIVE'
            },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: sales,
        });
    } catch (error: any) {
        console.error('[Sales API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch sales',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

