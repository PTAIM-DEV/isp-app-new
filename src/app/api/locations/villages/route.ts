import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const districtId = searchParams.get('districtId');

    if (!districtId) {
        return NextResponse.json({ error: 'District ID is required' }, { status: 400 });
    }

    const villages = await prisma.village.findMany({
        where: { districtId, isActive: true },
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: { users: true }
            }
        }
    });

    return NextResponse.json(villages);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, districtId } = body;

        if (!name || !districtId) {
            return NextResponse.json({ error: 'Name and District ID are required' }, { status: 400 });
        }

        const village = await prisma.village.create({
            data: { name, districtId },
        });

        return NextResponse.json(village);
    } catch (error) {
        console.error('Create village error:', error);
        return NextResponse.json({ error: 'Failed to create village' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, districtId } = body;

        if (!id || !name || !districtId) {
            return NextResponse.json({ error: 'ID, Name and District ID are required' }, { status: 400 });
        }

        const village = await prisma.village.update({
            where: { id },
            data: { name, districtId },
        });

        return NextResponse.json(village);
    } catch (error) {
        console.error('Update village error:', error);
        return NextResponse.json({ error: 'Failed to update village' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
        return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    try {
        await prisma.village.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete village error:', error);
        return NextResponse.json({ error: 'Failed to delete village' }, { status: 500 });
    }
}
