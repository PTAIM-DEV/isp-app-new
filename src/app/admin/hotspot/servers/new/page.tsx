import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import ServerForm from './server-form';

export const dynamic = 'force-dynamic';

export default async function NewServerPage() {
  const subscriptions = await prisma.saasSubscription.findMany({
    include: {
      tier: true,
      user: {
        select: {
          id: true,
          name: true
        }
      }
    },
    where: {
      isActive: true
    }
  });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Tambah Server MikroTik</h2>
        <p className="text-gray-500 mt-1">Tambahkan server MikroTik baru untuk hotspot management</p>
      </div>

      <ServerForm subscriptions={subscriptions} />
    </div>
  );
}


