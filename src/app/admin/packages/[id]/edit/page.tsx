import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { PackageForm } from '../../package-form';

interface PageProps {
    params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function EditPackagePage({ params }: PageProps) {
    const { id } = await params;

    const pkg = await prisma.servicePackage.findUnique({
        where: { id }
    });

    if (!pkg) {
        notFound();
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Edit Paket</h2>
            <PackageForm initialData={pkg} />
        </div>
    );
}
