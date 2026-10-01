import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { SalesForm } from '../../sales-form';
import Link from 'next/link';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditSalesPage({ params }: PageProps) {
    const { id } = await params;

    const sales = await prisma.user.findUnique({
        where: {
            id,
            role: 'SALES' as const
        },
    });

    if (!sales) {
        notFound();
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Edit Sales</h2>
                <Link href="/admin/sales" className="text-indigo-600 hover:text-indigo-900">
                    &larr; Kembali
                </Link>
            </div>

            <div className="bg-white shadow sm:rounded-lg p-6 max-w-2xl">
                <SalesForm initialData={sales} />
            </div>
        </div>
    );
}











