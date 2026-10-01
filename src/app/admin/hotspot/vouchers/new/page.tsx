import { prisma } from '@/lib/prisma';
import VoucherForm from './voucher-form';

export const dynamic = 'force-dynamic';

export default async function NewVoucherPage() {
  const servers = await prisma.mikrotikServer.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });

  const resellers = await prisma.user.findMany({
    where: {
      role: 'RESELLER',
      status: 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      phone: true
    },
    orderBy: { name: 'asc' }
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Buat Voucher Baru</h2>
        <p className="text-gray-500 mt-1">Generate voucher hotspot baru</p>
      </div>

      <VoucherForm servers={servers} resellers={resellers} />
    </div>
  );
}


