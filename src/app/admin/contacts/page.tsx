import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Search, Phone, Mail, MapPin, Tag } from 'lucide-react';
import ContactsList from './contacts-list';
import AddContactButton from './add-contact-button';

export const dynamic = 'force-dynamic';

export default async function ContactsPage({
    searchParams,
}: {
    searchParams: Promise<{ search?: string; status?: string }>;
}) {
    const params = await searchParams;
    const search = params.search || '';
    const status = params.status || '';

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

    // Check if contact model is available
    if (!prisma.contact) {
        throw new Error('Contact model not found in Prisma Client. Please restart the dev server after running: npx prisma generate');
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

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Daftar Kontak</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Kelola kontak yang belum menjadi customer atau lead
                    </p>
                </div>
                <AddContactButton />
            </div>

            <ContactsList initialContacts={contacts} />
        </div>
    );
}

