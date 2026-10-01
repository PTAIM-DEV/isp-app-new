import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import ServerForm from '../../new/server-form';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditServerPage({ params }: PageProps) {
  const { id } = await params;

  const [server, subscriptions] = await Promise.all([
    prisma.mikrotikServer.findUnique({
      where: { id }
    }),
    prisma.saasSubscription.findMany({
      include: {
        tier: true,
        user: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  ]);

  if (!server) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Edit Server MikroTik</h2>
        <p className="text-gray-500 mt-1">Edit konfigurasi server MikroTik</p>
      </div>

      <ServerForm subscriptions={subscriptions} serverData={server} />
    </div>
  );
}


