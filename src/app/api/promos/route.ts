import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const promos = await prisma.promo.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(promos);
    } catch (error) {
        console.error('Error fetching promos:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        // Check if code already exists
        const existing = await prisma.promo.findUnique({
            where: { code: body.code },
        });

        if (existing) {
            return NextResponse.json({ error: 'Kode promo sudah ada' }, { status: 400 });
        }

        const promo = await prisma.promo.create({
            data: {
                code: body.code.toUpperCase(),
                name: body.name,
                description: body.description || null,
                type: body.type,
                value: body.value ? body.value : null,
                cycleDuration: body.cycleDuration ? parseInt(body.cycleDuration) : null,
                applicableToFlowIds: body.applicableToFlowIds || '[]',
                applicableToPackageIds: body.applicableToPackageIds || '[]',
                validFrom: new Date(body.validFrom),
                validUntil: body.validUntil ? new Date(body.validUntil) : null,
                maxUses: body.maxUses ? parseInt(body.maxUses) : null,
                isActive: body.isActive !== undefined ? body.isActive : true,
            },
        });

        return NextResponse.json(promo);
    } catch (error) {
        console.error('Error creating promo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


