import { prisma } from '@/lib/prisma';
import PackageForm from './package-form';

export const dynamic = 'force-dynamic';

export default async function NewPackagePage() {
  const servers = await prisma.mikrotikServer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Tambah Paket Hotspot</h2>
        <p className="text-gray-500 mt-1">Buat paket baru untuk voucher hotspot</p>
      </div>

      <PackageForm servers={servers} />
    </div>
  );
}


