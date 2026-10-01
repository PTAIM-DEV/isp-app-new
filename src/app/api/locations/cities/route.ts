import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

// GET /api/locations/cities?provinceId={id} - List cities by province
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const provinceId = searchParams.get('provinceId');

        const cities = await prisma.city.findMany({
            where: {
                ...(provinceId && { provinceId }),
                isActive: true,
            },
            include: {
                province: true,
                _count: {
                    select: { districts: true, users: true },
                },
            },
            orderBy: { name: 'asc' },
        });

        return NextResponse.json(cities);
    } catch (error) {
        console.error('Error fetching cities:', error);
        return NextResponse.json(
            { error: 'Failed to fetch cities' },
            { status: 500 }
        );
    }
}

// POST /api/locations/cities - Create new city
export async function POST(request: Request) {
    try {
        const { name, provinceId } = await request.json();

        if (!name || name.trim().length === 0) {
            return NextResponse.json(
                { error: 'City name is required' },
                { status: 400 }
            );
        }

        if (!provinceId) {
            return NextResponse.json(
                { error: 'Province ID is required' },
                { status: 400 }
            );
        }

        const city = await prisma.city.create({
            data: {
                name: name.trim(),
                provinceId,
            },
            include: { province: true },
        });

        return NextResponse.json(city, { status: 201 });
    } catch (error: any) {
        console.error('Error creating city:', error);

        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'City with this name already exists in this province' },
                { status: 409 }
            );
        }

        if (error.code === 'P2003') {
            return NextResponse.json(
                { error: 'Province not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create city' },
            { status: 500 }
        );
    }
}

// PUT /api/locations/cities - Update city
export async function PUT(request: Request) {
    try {
        const { id, name, provinceId, isActive } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: 'City ID is required' },
                { status: 400 }
            );
        }

        const city = await prisma.city.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(provinceId !== undefined && { provinceId }),
                ...(isActive !== undefined && { isActive }),
            },
            include: { province: true },
        });

        return NextResponse.json(city);
    } catch (error: any) {
        console.error('Error updating city:', error);

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'City not found' },
                { status: 404 }
            );
        }

        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'City with this name already exists in this province' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to update city' },
            { status: 500 }
        );
    }
}

// DELETE /api/locations/cities?id={id} - Delete city
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json(
                { error: 'City ID is required' },
                { status: 400 }
            );
        }

        await prisma.city.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error deleting city:', error);

        if (error.code === 'P2025') {
            return NextResponse.json(
                { error: 'City not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to delete city' },
            { status: 500 }
        );
    }
}
