import { prisma } from '@/lib/prisma';
import KomisiRuleForm from './komisi-rule-form';

export const dynamic = 'force-dynamic';

export default async function NewKomisiRulePage() {
  const packages = await prisma.hotspotPackage.findMany({
    where: { isActive: true },
    include: {
      server: {
        select: {
          id: true,
          name: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  const servers = await prisma.mikrotikServer.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Tambah Komisi Rule</h2>
        <p className="text-gray-500 mt-1">Buat rule baru untuk komisi reseller</p>
      </div>

      <KomisiRuleForm packages={packages} servers={servers} />
    </div>
  );
}


