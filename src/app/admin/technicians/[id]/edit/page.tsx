import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { TechnicianForm } from '../../technician-form';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditTechnicianPage({ params }: PageProps) {
    const { id } = await params;

    const [technician, provinces] = await Promise.all([
        prisma.user.findUnique({
            where: {
                id,
                role: 'TECHNICIAN'
            },
        }),
        prisma.province.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    if (!technician) {
        notFound();
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Edit Teknisi</h2>
                <Link href="/admin/technicians" className="text-indigo-600 hover:text-indigo-900">
                    &larr; Kembali
                </Link>
            </div>

            <div className="bg-white shadow sm:rounded-lg p-6">
                <TechnicianForm initialData={technician} provinces={provinces} />
            </div>
        </div>
    );
}
