import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/locations/districts?cityId={id} - List districts by city
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const cityId = searchParams.get('cityId');

        const districts = await prisma.district.findMany({
            where: {
                ...(cityId && { cityId }),
                isActive: true,
            },
            include: {
                city: {
                    include: { province: true },
                },
                _count: {
                    select: { users: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(districts);
    } catch (error) {
        console.error('Error fetching districts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch districts' },
            { status: 500 }
        );
    }
}

// POST /api/locations/districts - Create new district
export async function POST(request: Request) {
    try {
        const { name, cityId } = await request.json();

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'District name is required' },
                { status: 400 }
            );
        }

        if (!cityId) {
            return NextResponse.json(
                { error: 'City ID is required' },
                { status: 400 }
            );
        }

        const district = await prisma.district.create({
            data: {
                name: name.trim(),
                cityId,
            },
            include: {
                city: {
                    include: { province: true },
                },
            },
        });

        return NextResponse.json(district, { status: 201 });
    } catch (error: any) {
        console.error('Error creating district:', error);

        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'District with this name already exists in this city' },
                { status: 409 }
            );
        }

        if (error.code === 'P2003') {
            return NextResponse.json(
                { error: 'City not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create district' },
            { status: 500 }
        );
    }
}

// PUT /api/locations/districts - Update district
export async function PUT(request: Request) {
    try {
        const { id, name, cityId, isActive } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'District ID is required' },
                { status: 400 }
            );
        }

        const district = await prisma.district.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(cityId !== undefined && { cityId }),
                ...(isActive !== undefined && { isActive }),
            },
            include: {
                city: {
                    include: { province: true },
                },
            },
        });

        return NextResponse.json(district);
    } catch (error: any) {
        console.error('Error updating district:', error);

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'District not found' },
                { status: 404 }
            );
        }

        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'District with this name already exists in this city' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update district' },
            { status: 500 }
        );
    }
}

// DELETE /api/locations/districts?id={id} - Delete district
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'District ID is required' },
                { status: 400 }
            );
        }

        await prisma.district.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting district:', error);

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'District not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to delete district' },
            { status: 500 }
        );
    }
}
