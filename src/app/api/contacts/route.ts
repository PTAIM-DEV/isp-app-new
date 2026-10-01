import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/contacts - Get all contacts
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search');
        const status = searchParams.get('status');

        const where: any = {};
        
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (status) {
            where.status = status;
        }

        const contacts = await prisma.contact.findMany({
            where,
            orderBy: { updatedAt: 'desc' },
            include: {
                chat: {
                    select: {
                        id: true,
                        name: true,
                        jid: true,
                    }
                }
            }
        });

        return NextResponse.json({ contacts });
    } catch (error) {
        console.error('Error fetching contacts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contacts' },
            { status: 500 }
        );
    }
}

// POST /api/contacts - Create new contact
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, phone, email, address, notes, tags, source, sourceId, chatId } = body;

        if (!name || !phone) {
            return NextResponse.json(
                { error: 'Name and phone are required' },
                { status: 400 }
            );
        }

        // Check if contact with same phone already exists
        const existingContact = await prisma.contact.findUnique({
            where: { phone }
        });

        if (existingContact) {
            return NextResponse.json(
                { error: 'Contact with this phone number already exists', contact: existingContact },
                { status: 409 }
            );
        }

        const contact = await prisma.contact.create({
            data: {
                name,
                phone,
                email,
                address,
                notes,
                tags: tags || [],
                source: source || 'MANUAL',
                sourceId,
                chatId,
            },
            include: {
                chat: {
                    select: {
                        id: true,
                        name: true,
                        jid: true,
                    }
                }
            }
        });

        return NextResponse.json({ contact }, { status: 201 });
    } catch (error: any) {
        console.error('Error creating contact:', error);
        
        if (error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Contact with this phone number already exists' },
                { status: 409 }
            );
        }

        return NextResponse.json(
            { error: 'Failed to create contact' },
            { status: 500 }
        );
    }
}

