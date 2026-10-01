import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/whatsapp/customer-info?phone=628123456789
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get('phone');

        if (!phone) {
            return NextResponse.json(
                { error: 'Phone number is required' },
                { status: 400 }
            );
        }

        // Try to find customer in User table
        const user = await prisma.user.findUnique({
            where: { phone },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
                status: true,
            }
        });

        if (user) {
            return NextResponse.json({
                customer: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email || undefined,
                    address: user.address || undefined,
                    status: user.status,
                }
            });
        }

        // Try to find in Contact table
        const contact = await prisma.contact.findUnique({
            where: { phone },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                address: true,
                status: true,
            }
        });

        if (contact) {
            return NextResponse.json({
                customer: {
                    id: contact.id,
                    name: contact.name,
                    phone: contact.phone,
                    email: contact.email || undefined,
                    address: contact.address || undefined,
                    status: contact.status,
                }
            });
        }

        // No customer found
        return NextResponse.json({ customer: null });
    } catch (error: any) {
        console.error('Error fetching customer info:', error);
        return NextResponse.json(
            { error: 'Failed to fetch customer info' },
            { status: 500 }
        );
    }
}

