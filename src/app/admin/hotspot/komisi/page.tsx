import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { CreditCard, Plus, DollarSign } from 'lucide-react';
import KomisiTabs from './komisi-tabs';

export const dynamic = 'force-dynamic';

export default async function KomisiPage() {
  const rules = await prisma.komisiRule.findMany({
    include: {
      package: {
        select: {
          name: true
        }
      },
      server: {
        select: {
          name: true
        }
      },
      _count: {
        select: {
          komisiRecords: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const records = await prisma.komisiRecord.findMany({
    include: {
      resellerUser: {
        select: {
          name: true,
          phone: true
        }
      },
      sale: {
        include: {
          voucher: {
            select: {
              code: true
            }
          }
        }
      },
      rule: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 50
  });

  // Calculate totals
  const totals = await prisma.komisiRecord.aggregate({
    _sum: {
      komisiAmount: true
    },
    _count: true
  });

  const pendingTotal = await prisma.komisiRecord.aggregate({
    where: {
      status: 'PENDING'
    },
    _sum: {
      komisiAmount: true
    }
  });

  const paidTotal = await prisma.komisiRecord.aggregate({
    where: {
      status: 'PAID'
    },
    _sum: {
      komisiAmount: true
    }
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Komisi Management</h2>
          <p className="text-gray-500 mt-1">Kelola rules dan records komisi reseller</p>
        </div>
        <Link
          href="/admin/hotspot/komisi/rules/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Tambah Komisi Rule
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Komisi</p>
              <p className="text-2xl font-bold text-indigo-600">
                Rp {Number(totals._sum.komisiAmount || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <DollarSign className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">
                Rp {Number(pendingTotal._sum.komisiAmount || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-full">
              <CreditCard className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Paid</p>
              <p className="text-2xl font-bold text-green-600">
                Rp {Number(paidTotal._sum.komisiAmount || 0).toLocaleString('id-ID')}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <CreditCard className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Rules</p>
              <p className="text-2xl font-bold text-blue-600">{rules.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <KomisiTabs 
        rules={rules.map(rule => ({
          ...rule,
          komisiValue: Number(rule.komisiValue),
          minSaleAmount: rule.minSaleAmount ? Number(rule.minSaleAmount) : null,
          maxKomisiAmount: rule.maxKomisiAmount ? Number(rule.maxKomisiAmount) : null
        }))} 
        records={records.map(record => ({
          ...record,
          komisiAmount: Number(record.komisiAmount)
        }))} 
      />
    </div>
  );
}

