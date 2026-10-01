'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, Wifi, CheckCircle2 } from 'lucide-react';

interface Server {
  id: string;
  name: string;
}

interface Reseller {
  id: string;
  name: string;
  phone: string;
}

interface Package {
  id: string;
  name: string;
  duration: number;
  price: number;
  limitUptime: string | null;
}

interface VoucherFormProps {
  servers: Server[];
  resellers: Reseller[];
}

export default function VoucherForm({ servers, resellers }: VoucherFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [generatedVouchers, setGeneratedVouchers] = useState<any[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);

  const [formData, setFormData] = useState({
    serverId: '',
    resellerUserId: '',
    packageId: '',
    description: '',
    username: false,
    password: false,
    quantity: 1,
    price: '',
    codeLength: 8,
    prefix: '',
    combination: 'ALPHANUMERIC'
  });

  // Load packages when server changes
  useEffect(() => {
    if (formData.serverId) {
      fetch(`/api/admin/hotspot/packages?serverId=${formData.serverId}`)
        .then(res => res.json())
        .then(data => {
          if (data.packages) {
            setPackages(data.packages);
            // Auto-select first package if available
            if (data.packages.length > 0 && !formData.packageId) {
              setFormData(prev => ({
                ...prev,
                packageId: data.packages[0].id,
                price: String(data.packages[0].price)
              }));
            }
          }
        })
        .catch(err => console.error('Error loading packages:', err));
    } else {
      setPackages([]);
    }
  }, [formData.serverId]);

  // Update price when package changes
  useEffect(() => {
    if (formData.packageId && packages.length > 0) {
      const selectedPackage = packages.find(p => p.id === formData.packageId);
      if (selectedPackage) {
        setFormData(prev => ({
          ...prev,
          price: String(selectedPackage.price)
        }));
      }
    }
  }, [formData.packageId, packages]);

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
    setSuccess(false);
    setGeneratedVouchers([]);

    try {
      const response = await fetch('/api/admin/hotspot/vouchers/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId: formData.serverId,
          packageId: formData.packageId,
          quantity: parseInt(String(formData.quantity)),
          prefix: formData.prefix,
          codeLength: parseInt(String(formData.codeLength)),
          combination: formData.combination,
          username: formData.username,
          password: formData.password,
          resellerUserId: formData.resellerUserId || null
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setGeneratedVouchers(data.vouchers || []);
        
        // Redirect ke list voucher setelah 1 detik
        setTimeout(() => {
          router.push('/admin/hotspot/vouchers');
        }, 1000);
      } else {
        setError(data.error || 'Failed to generate vouchers');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate vouchers');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-center">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Voucher berhasil di-generate!
            </div>
          )}

          {/* Server Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pilih Server *
            </label>
            <select
              name="serverId"
              value={formData.serverId}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Filter Server</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
          </div>

          {/* Reseller Selection (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              User Reseller (Opsional)
            </label>
            <select
              name="resellerUserId"
              value={formData.resellerUserId}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Pilih User</option>
              {resellers.map((reseller) => (
                <option key={reseller.id} value={reseller.id}>
                  {reseller.name} ({reseller.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Package Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paket *
            </label>
            <select
              name="packageId"
              value={formData.packageId}
              onChange={handleChange}
              required
              disabled={!formData.serverId || packages.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">Pilih Paket</option>
              {packages.map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name} - {pkg.duration} menit - Rp {Number(pkg.price).toLocaleString('id-ID')}
                </option>
              ))}
            </select>
            {formData.serverId && packages.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">Tidak ada paket untuk server ini</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi Voucher
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              placeholder="Durasi 2 jam"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Username & Password Checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center">
              <input
                type="checkbox"
                name="username"
                checked={formData.username}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Username
              </label>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="password"
                checked={formData.password}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Password
              </label>
            </div>
            <p className="text-xs text-gray-500 ml-6">
              Tentukan apakah voucher dapat digunakan untuk username atau keduanya.
            </p>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah Voucher *
            </label>
            <input
              type="number"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              required
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Info Kuota Waktu */}
          <div className="p-3 border border-blue-100 bg-blue-50 rounded text-sm text-blue-800">
            Kuota Waktu (limit-uptime) mengikuti paket dan tidak dapat diubah di sini. Kuota adalah total waktu online
            akumulatif di MikroTik; saat habis, user otomatis logout.
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Harga Voucher *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">Rp</span>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                required
                min="0"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Code Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Panjang Huruf *
            </label>
            <input
              type="number"
              name="codeLength"
              value={formData.codeLength}
              onChange={handleChange}
              required
              min="1"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-xs text-red-600 mt-1">* Maksimal 10</p>
          </div>

          {/* Prefix */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Awalan / Prefix
            </label>
            <input
              type="text"
              name="prefix"
              value={formData.prefix}
              onChange={handleChange}
              placeholder="Huruf awalan / Prefix"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Combination */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kombinasi *
            </label>
            <select
              name="combination"
              value={formData.combination}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALPHANUMERIC">Pilih Kombinasi</option>
              <option value="ALPHANUMERIC">Alphanumeric (A-Z, 0-9)</option>
              <option value="NUMERIC">Numeric (0-9)</option>
              <option value="ALPHABET">Alphabet (A-Z)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Link
              href="/admin/hotspot/vouchers"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={isLoading || !formData.serverId || !formData.packageId}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                  Generating...
                </>
              ) : (
                'Simpan'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Generated Vouchers Preview */}
      {success && generatedVouchers.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Voucher yang di-generate ({generatedVouchers.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {generatedVouchers.map((voucher) => (
              <div key={voucher.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-semibold text-lg">{voucher.code}</span>
                  <Wifi className="w-5 h-5 text-indigo-600" />
                </div>
                {voucher.username && (
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Username:</span> {voucher.username}
                  </div>
                )}
                {voucher.password && (
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Password:</span> {voucher.password}
                  </div>
                )}
                <div className="text-sm text-gray-500">
                  Status: <span className="font-medium">{voucher.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


