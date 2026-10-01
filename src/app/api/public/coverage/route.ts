import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
        return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Find matching villages
    const villages = await prisma.village.findMany({
        where: {
            name: { contains: query, mode: 'insensitive' },
            isActive: true
        },
        include: {
            district: {
                include: {
                    city: {
                        include: {
                            province: true
                        }
                    }
                }
            }
        },
        take: 10
    });

    const results = villages.map(v => ({
        id: v.id,
        type: 'VILLAGE',
        name: v.name,
        district: v.district.name,
        city: v.district.city.name,
        province: v.district.city.province.name,
        fullAddress: `${v.name}, ${v.district.name}, ${v.district.city.name}, ${v.district.city.province.name}`,
        isCovered: true
    }));

    return NextResponse.json({
        available: results.length > 0,
        locations: results
    });
}
