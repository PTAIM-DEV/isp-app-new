'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  server: {
    id: string;
    name: string;
  };
}

interface Server {
  id: string;
  name: string;
}

interface KomisiRuleFormProps {
  packages: Package[];
  servers: Server[];
}

export default function KomisiRuleForm({ packages, servers }: KomisiRuleFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    packageId: '',
    serverId: '',
    resellerLevel: '',
    komisiType: 'PERCENTAGE',
    komisiValue: '',
    minSaleAmount: '',
    maxKomisiAmount: '',
    validFrom: new Date().toISOString().split('T')[0],
    validUntil: '',
    isActive: true
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
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
      const response = await fetch('/api/admin/hotspot/komisi/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          komisiValue: parseFloat(formData.komisiValue),
          minSaleAmount: formData.minSaleAmount ? parseFloat(formData.minSaleAmount) : null,
          maxKomisiAmount: formData.maxKomisiAmount ? parseFloat(formData.maxKomisiAmount) : null,
          resellerLevel: formData.resellerLevel ? parseInt(formData.resellerLevel) : null,
          packageId: formData.packageId || null,
          serverId: formData.serverId || null,
          validUntil: formData.validUntil || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/hotspot/komisi');
        router.refresh();
      } else {
        setError(data.error || 'Failed to create komisi rule');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create komisi rule');
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
          <h3 className="text-lg font-medium mb-4">Informasi Rule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Rule *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Rule Komisi Paket A"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Komisi Type *
              </label>
              <select
                name="komisiType"
                value={formData.komisiType}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PERCENTAGE">Percentage (%)</option>
                <option value="FIXED">Fixed Amount (Rp)</option>
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
                rows={2}
                placeholder="Deskripsi rule..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Applicable To */}
        <div>
          <h3 className="text-lg font-medium mb-4">Applicable To</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Package (Optional)
              </label>
              <select
                name="packageId"
                value={formData.packageId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Package</option>
                {packages.map((pkg) => (
                  <option key={pkg.id} value={pkg.id}>
                    {pkg.name} ({pkg.server.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Server (Optional)
              </label>
              <select
                name="serverId"
                value={formData.serverId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Semua Server</option>
                {servers.map((server) => (
                  <option key={server.id} value={server.id}>
                    {server.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reseller Level (Optional)
              </label>
              <input
                type="number"
                name="resellerLevel"
                value={formData.resellerLevel}
                onChange={handleChange}
                min="1"
                placeholder="1, 2, 3..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Komisi Configuration */}
        <div>
          <h3 className="text-lg font-medium mb-4">Konfigurasi Komisi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Komisi Value *
              </label>
              <div className="relative">
                {formData.komisiType === 'PERCENTAGE' ? (
                  <>
                    <input
                      type="number"
                      name="komisiValue"
                      value={formData.komisiValue}
                      onChange={handleChange}
                      required
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="10"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-gray-500">%</span>
                  </>
                ) : (
                  <>
                    <span className="absolute left-3 top-2 text-gray-500">Rp</span>
                    <input
                      type="number"
                      name="komisiValue"
                      value={formData.komisiValue}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder="5000"
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Sale Amount (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">Rp</span>
                <input
                  type="number"
                  name="minSaleAmount"
                  value={formData.minSaleAmount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="10000"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Komisi Amount (Optional)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">Rp</span>
                <input
                  type="number"
                  name="maxKomisiAmount"
                  value={formData.maxKomisiAmount}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  placeholder="100000"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Validity */}
        <div>
          <h3 className="text-lg font-medium mb-4">Validity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid From *
              </label>
              <input
                type="date"
                name="validFrom"
                value={formData.validFrom}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until (Optional)
              </label>
              <input
                type="date"
                name="validUntil"
                value={formData.validUntil}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <div className="flex items-center">
            <input
              type="checkbox"
              name="isActive"
              checked={formData.isActive}
              onChange={handleChange}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <label className="ml-2 block text-sm text-gray-700">
              Active
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link
            href="/admin/hotspot/komisi"
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
              'Simpan Rule'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}


