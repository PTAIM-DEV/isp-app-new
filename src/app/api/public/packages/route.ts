import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
    const packages = await prisma.servicePackage.findMany({
        where: { isActive: true },
        orderBy: { price: 'asc' },
    });

    return NextResponse.json(packages);
}
