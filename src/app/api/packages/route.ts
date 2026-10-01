import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const packages = await prisma.servicePackage.findMany({
            where: { isActive: true },
            orderBy: { price: 'asc' }
        });

        return NextResponse.json(packages);
    } catch (error) {
        console.error('Error fetching packages:', error);
        return NextResponse.json([], { status: 500 });
    }
}
