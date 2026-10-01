import { TechnicianForm } from '../technician-form';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function NewTechnicianPage() {
    const provinces = await prisma.province.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Tambah Teknisi Baru</h2>
            <div className="bg-white shadow sm:rounded-lg p-6">
                <TechnicianForm provinces={provinces} />
            </div>
        </div>
    );
}
