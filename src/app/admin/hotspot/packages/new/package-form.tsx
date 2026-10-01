'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Server {
  id: string;
  name: string;
}

interface PackageFormProps {
  servers: Server[];
  packageData?: {
    id: string;
    name: string;
    description: string | null;
    serverId: string;
    duration: number;
    limitUptime: string | null;
    price: number;
    downloadSpeed: string | null;
    uploadSpeed: string | null;
    isActive: boolean;
  };
}

export default function PackageForm({ servers, packageData }: PackageFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: packageData?.name || '',
    description: packageData?.description || '',
    serverId: packageData?.serverId || '',
    duration: packageData?.duration || 60,
    limitUptime: packageData?.limitUptime || '',
    price: packageData?.price ? Number(packageData.price) : 0,
    downloadSpeed: packageData?.downloadSpeed || '',
    uploadSpeed: packageData?.uploadSpeed || '',
    isActive: packageData?.isActive ?? true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = packageData 
        ? `/api/admin/hotspot/packages/${packageData.id}`
        : '/api/admin/hotspot/packages';
      
      const method = packageData ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(String(formData.duration)),
          price: parseFloat(String(formData.price)),
          limitUptime: formData.limitUptime || null,
          downloadSpeed: formData.downloadSpeed || null,
          uploadSpeed: formData.uploadSpeed || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/hotspot/packages');
        router.refresh();
      } else {
        setError(data.error || `Failed to ${packageData ? 'update' : 'create'} package`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${packageData ? 'update' : 'create'} package`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div>
          <h3 className="text-lg font-medium mb-4">Informasi Paket</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Paket *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Paket 1 Jam"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Server *
              </label>
              <select
                name="serverId"
                value={formData.serverId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Pilih Server</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Deskripsi paket..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Voucher Configuration */}
        <div>
          <h3 className="text-lg font-medium mb-4">Konfigurasi Voucher</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Masa Berlaku Voucher (menit) *
              </label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                required
                min="1"
                placeholder="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Durasi dalam menit (contoh: 60 = 1 jam, 1440 = 1 hari)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kuota Waktu (limit-uptime, total online)
              </label>
              <input
                type="text"
                name="limitUptime"
                value={formData.limitUptime}
                onChange={handleChange}
                placeholder="10m / 1h / 2d (format MikroTik)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Kuota total waktu online (limit-uptime) di MikroTik. Uptime hanya bertambah saat terkoneksi; saat kuota habis,
                Mikrotik otomatis logout. Ini bukan masa berlaku kalender. Contoh: 1h (1 jam), 2d (2 hari), 60m (60 menit).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga (Rp) *
              </label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                step="100"
                placeholder="10000"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Aktif
              </label>
            </div>
          </div>
        </div>

        {/* Bandwidth Limit (Optional) */}
        <div>
          <h3 className="text-lg font-medium mb-4">Limit Bandwidth (Opsional)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Download Speed
              </label>
              <input
                type="text"
                name="downloadSpeed"
                value={formData.downloadSpeed}
                onChange={handleChange}
                placeholder="10M"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Contoh: 10M (10 Mbps), 1G (1 Gbps)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload Speed
              </label>
              <input
                type="text"
                name="uploadSpeed"
                value={formData.uploadSpeed}
                onChange={handleChange}
                placeholder="5M"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Contoh: 5M (5 Mbps), 500K (500 Kbps)
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link
            href="/admin/hotspot/packages"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                Menyimpan...
              </>
            ) : (
              packageData ? 'Update Paket' : 'Simpan Paket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
