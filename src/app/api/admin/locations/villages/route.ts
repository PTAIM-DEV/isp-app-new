import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const districtId = searchParams.get('districtId');

        if (!districtId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'districtId is required',
                },
                { status: 400 }
            );
        }

        const villages = await prisma.village.findMany({
            where: {
                districtId,
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
            data: villages,
        });
    } catch (error: any) {
        console.error('[Villages API] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch villages',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

