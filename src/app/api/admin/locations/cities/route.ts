import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const provinceId = searchParams.get('provinceId');

        if (!provinceId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'provinceId is required',
                },
                { status: 400 }
            );
        }

        const cities = await prisma.city.findMany({
            where: {
                provinceId,
                isActive: true,
            },
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
            },
        });

        return NextResponse.json({
            success: true,
            data: cities,
        });
    } catch (error: any) {
        console.error('[Cities API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch cities',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

