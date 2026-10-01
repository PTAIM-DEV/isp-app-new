import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const cityId = searchParams.get('cityId');

        if (!cityId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'cityId is required',
                },
                { status: 400 }
            );
        }

        const districts = await prisma.district.findMany({
            where: {
                cityId,
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
            data: districts,
        });
    } catch (error: any) {
        console.error('[Districts API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch districts',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

