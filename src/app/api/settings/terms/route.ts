import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const setting = await prisma.systemSetting.findUnique({
            where: { key: 'terms_and_conditions' },
        });
        return NextResponse.json({ content: setting?.value || '' });
    } catch (error) {
        console.error('Error fetching terms:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
