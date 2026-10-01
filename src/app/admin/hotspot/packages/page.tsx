import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Package, Plus } from 'lucide-react';
import PackagesClient from './packages-client';

export const dynamic = 'force-dynamic';

export default async function HotspotPackagesPage() {
  const packages = await prisma.hotspotPackage.findMany({
    include: {
      server: {
        select: {
          id: true,
          name: true
        }
      },
      _count: {
        select: {
          vouchers: true,
          sales: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Serialize price (Prisma Decimal) to number for client component
  const packagesData = packages.map(pkg => ({
    ...pkg,
    price: Number(pkg.price)
  }));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Hotspot Packages</h2>
          <p className="text-gray-500 mt-1">Kelola paket voucher hotspot</p>
        </div>
        <Link
          href="/admin/hotspot/packages/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Tambah Paket
        </Link>
      </div>

      {packages.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada paket</h3>
          <p className="text-gray-500 mb-4">Tambahkan paket pertama Anda untuk mulai membuat voucher.</p>
          <Link
            href="/admin/hotspot/packages/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tambah Paket Pertama
          </Link>
        </div>
      ) : (
        <PackagesClient packages={packagesData} />
      )}
    </div>
  );
}


