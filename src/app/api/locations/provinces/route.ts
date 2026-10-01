import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/locations/provinces - List all active provinces
export async function GET() {
    try {
        const provinces = await prisma.province.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { cities: true, users: true },
                },
            },
        });

        return NextResponse.json(provinces);
    } catch (error) {
        console.error('Error fetching provinces:', error);
        return NextResponse.json(
            { error: 'Failed to fetch provinces' },
            { status: 500 }
        );
    }
}

// POST /api/locations/provinces - Create new province
export async function POST(request: Request) {
    try {
        const { name } = await request.json();

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'Province name is required' },
                { status: 400 }
            );
        }

        const province = await prisma.province.create({
            data: { name: name.trim() },
        });

        return NextResponse.json(province, { status: 201 });
    } catch (error: any) {
        console.error('Error creating province:', error);

        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Province with this name already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create province' },
            { status: 500 }
        );
    }
}

// PUT /api/locations/provinces - Update province
export async function PUT(request: Request) {
    try {
        const { id, name, isActive } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'Province ID is required' },
                { status: 400 }
            );
        }

        const province = await prisma.province.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(isActive !== undefined && { isActive }),
            },
        });

        return NextResponse.json(province);
    } catch (error: any) {
        console.error('Error updating province:', error);

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Province not found' },
                { status: 404 }
            );
        }

        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Province with this name already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update province' },
            { status: 500 }
        );
    }
}

// DELETE /api/locations/provinces?id={id} - Delete province
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'Province ID is required' },
                { status: 400 }
            );
        }

        await prisma.province.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting province:', error);

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'Province not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to delete province' },
            { status: 500 }
        );
    }
}
