import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { PackageList } from './package-list';

export const dynamic = 'force-dynamic';

export default async function PackagesPage() {
    const packages = await prisma.servicePackage.findMany({
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Paket Layanan Internet</h2>
                <Link
                    href="/admin/packages/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    + Tambah Paket
                </Link>
            </div>

            <PackageList packages={packages} />
        </div>
    );
}
