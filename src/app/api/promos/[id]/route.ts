import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const promo = await prisma.promo.findUnique({
            where: { id },
        });

        if (!promo) {
            return NextResponse.json({ error: 'Promo not found' }, { status: 404 });
        }

        return NextResponse.json(promo);
    } catch (error) {
        console.error('Error fetching promo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        // Check if promo exists
        const existing = await prisma.promo.findUnique({
            where: { id },
        });

        if (!existing) {
            return NextResponse.json({ error: 'Promo not found' }, { status: 404 });
        }

        // If code is being changed, check if new code already exists
        if (body.code && body.code !== existing.code) {
            const codeExists = await prisma.promo.findUnique({
                where: { code: body.code.toUpperCase() },
            });

            if (codeExists) {
                return NextResponse.json({ error: 'Kode promo sudah ada' }, { status: 400 });
            }
        }

        const promo = await prisma.promo.update({
            where: { id },
            data: {
                code: body.code ? body.code.toUpperCase() : undefined,
                name: body.name,
                description: body.description || null,
                type: body.type,
                value: body.value ? body.value : null,
                cycleDuration: body.cycleDuration ? parseInt(body.cycleDuration) : null,
                applicableToFlowIds: body.applicableToFlowIds || '[]',
                applicableToPackageIds: body.applicableToPackageIds || '[]',
                validFrom: body.validFrom ? new Date(body.validFrom) : undefined,
                validUntil: body.validUntil ? new Date(body.validUntil) : null,
                maxUses: body.maxUses ? parseInt(body.maxUses) : null,
                isActive: body.isActive !== undefined ? body.isActive : undefined,
            },
        });

        return NextResponse.json(promo);
    } catch (error) {
        console.error('Error updating promo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Soft delete by setting isActive to false
        const promo = await prisma.promo.update({
            where: { id },
            data: { isActive: false },
        });

        return NextResponse.json(promo);
    } catch (error) {
        console.error('Error deleting promo:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
