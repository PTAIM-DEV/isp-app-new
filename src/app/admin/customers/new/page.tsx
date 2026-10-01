import { prisma } from '@/lib/prisma';
import { CustomerForm } from '../customer-form';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function NewCustomerPage() {
    const packages = await prisma.servicePackage.findMany({
        where: { isActive: true },
    });

    const paymentFlows = await prisma.paymentFlow.findMany({
        where: { isActive: true },
    });

    const provinces = await prisma.province.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });

    const sales = await prisma.user.findMany({
        where: {
            role: 'SALES' as const,
            status: 'ACTIVE'
        },
        orderBy: { name: 'asc' },
    });

    // Serialize Decimal fields to numbers for Client Component
    const serializedPackages = packages.map(pkg => ({
        ...pkg,
        price: Number(pkg.price),
    }));

    const serializedPaymentFlows = paymentFlows.map(flow => ({
        ...flow,
        installationFeeAmount: flow.installationFeeAmount ? Number(flow.installationFeeAmount) : null,
    }));

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Tambah Pelanggan Baru</h2>
                <Link href="/admin/customers" className="text-indigo-600 hover:text-indigo-900">
                    &larr; Kembali
                </Link>
            </div>

            <div className="bg-white shadow sm:rounded-lg p-6 max-w-4xl">
                <CustomerForm
                    packages={serializedPackages}
                    paymentFlows={serializedPaymentFlows}
                    provinces={provinces}
                    sales={sales}
                />
            </div>
        </div>
    );
}
