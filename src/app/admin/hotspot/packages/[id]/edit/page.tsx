import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import PackageForm from '../../new/package-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditPackagePage({ params }: PageProps) {
  const { id } = await params;

  const [packageData, servers] = await Promise.all([
    prisma.hotspotPackage.findUnique({
      where: { id }
    }),
    prisma.mikrotikServer.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    })
  ]);

  if (!packageData) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Edit Paket Hotspot</h2>
        <p className="text-gray-500 mt-1">Edit paket voucher hotspot</p>
      </div>

      <PackageForm 
        servers={servers} 
        packageData={packageData ? {
          ...packageData,
          price: Number(packageData.price)
        } : undefined} 
      />
    </div>
  );
}

