'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Server, Trash2 } from 'lucide-react';

type PackageItem = {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  limitUptime: string | null;
  price: number;
  isActive: boolean;
  server: { id: string; name: string };
  _count: { vouchers: number; sales: number };
};

interface Props {
  packages: PackageItem[];
}

export default function PackagesClient({ packages }: Props) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === packages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(packages.map((p) => p.id));
    }
  };

  const handleDeleteSingle = async (id: string) => {
    if (!confirm('Hapus paket ini? Pastikan tidak ada voucher yang bergantung.')) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/hotspot/packages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menghapus paket');
      } else {
        alert('Paket berhasil dihapus');
        router.refresh();
      }
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus paket');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert('Pilih paket terlebih dahulu');
      return;
    }
    if (!confirm(`Hapus ${selectedIds.length} paket terpilih? Pastikan tidak ada voucher terkait.`)) return;
    setDeleting(true);
    try {
      const res = await fetch('/api/admin/hotspot/packages', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Gagal menghapus paket');
      } else {
        const blockedMsg = data.blocked?.length
          ? `Terblokir (punya voucher): ${data.blocked.map((b: any) => b.id).join(', ')}`
          : '';
        const notFoundMsg = data.notFound?.length
          ? `Tidak ditemukan: ${data.notFound.join(', ')}`
          : '';
        const okMsg = data.deleted?.length ? `Terhapus: ${data.deleted.join(', ')}` : '';
        alert([okMsg, blockedMsg, notFoundMsg].filter(Boolean).join('\n') || 'Selesai');
        setSelectedIds([]);
        router.refresh();
      }
    } catch (e: any) {
      alert(e.message || 'Gagal menghapus paket');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={selectedIds.length === packages.length && packages.length > 0}
            onChange={toggleSelectAll}
            className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
          />
          <span className="text-sm text-gray-700">
            {selectedIds.length} dipilih
          </span>
        </div>
        <button
          onClick={handleDeleteSelected}
          disabled={deleting || selectedIds.length === 0}
          className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md ${
            deleting || selectedIds.length === 0
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          }`}
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Hapus Terpilih
        </button>
      </div>

      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
              <input
                type="checkbox"
                checked={selectedIds.length === packages.length && packages.length > 0}
                onChange={toggleSelectAll}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Nama Paket
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Server
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Masa Berlaku (menit)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Kuota Waktu (limit-uptime)
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Harga
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vouchers
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {packages.map((pkg) => (
            <tr key={pkg.id} className="hover:bg-gray-50">
              <td className="px-3 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(pkg.id)}
                  onChange={() => toggleSelect(pkg.id)}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                {pkg.description && (
                  <div className="text-sm text-gray-500">{pkg.description}</div>
                )}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="flex items-center text-sm text-gray-900">
                  <Server className="w-4 h-4 mr-2" />
                  {pkg.server.name}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                {pkg.duration} menit
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {pkg.limitUptime || '-'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                Rp {Number(pkg.price).toLocaleString('id-ID')}
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                {pkg._count.vouchers} voucher
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {pkg.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                <Link
                  href={`/admin/hotspot/packages/${pkg.id}/edit`}
                  className="text-indigo-600 hover:text-indigo-900"
                >
                  Edit
                </Link>
                <button
                  onClick={() => handleDeleteSingle(pkg.id)}
                  disabled={deleting}
                  className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                >
                  Hapus
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}




