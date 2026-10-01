'use client';

import { useState } from 'react';
import { savePackage } from './actions';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface PackageFormProps {
    initialData?: {
        id: string;
        name: string;
        speed: string;
        price: number;
        description: string | null;
        features: string;
        priceIncludesPPN: boolean;
        isRecommended: boolean;
    };
}

export function PackageForm({ initialData }: PackageFormProps) {
    const router = useRouter();
    const [name, setName] = useState(initialData?.name || '');
    const [speed, setSpeed] = useState(initialData?.speed || '');
    const [price, setPrice] = useState(initialData?.price || 0);
    const [priceIncludesPPN, setPriceIncludesPPN] = useState(initialData?.priceIncludesPPN || false);
    const [isRecommended, setIsRecommended] = useState(initialData?.isRecommended || false);
    const [description, setDescription] = useState(initialData?.description || '');
    const [features, setFeatures] = useState<string[]>(
        initialData ? JSON.parse(initialData.features || '[]') : []
    );
    const [newFeature, setNewFeature] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    function addFeature() {
        if (newFeature.trim()) {
            setFeatures([...features, newFeature.trim()]);
            setNewFeature('');
        }
    }

    function removeFeature(index: number) {
        setFeatures(features.filter((_, i) => i !== index));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const result = await savePackage({
            id: initialData?.id,
            name,
            speed,
            price,
            description,
            features,
            priceIncludesPPN,
            isRecommended,
        });

        setLoading(false);

        if (result.success) {
            router.push('/admin/packages');
        } else {
            setMessage(result.error || 'Gagal menyimpan paket');
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            {message && (
                <div className="p-4 rounded-md bg-red-50 text-red-700">
                    {message}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700">Nama Paket</label>
                <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Contoh: Home 50Mbps"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Kecepatan</label>
                <input
                    type="text"
                    required
                    value={speed}
                    onChange={(e) => setSpeed(e.target.value)}
                    placeholder="Contoh: 50 Mbps"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Harga per Bulan (Rp)</label>
                <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    placeholder="250000"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            <div className="flex items-center">
                <input
                    id="priceIncludesPPN"
                    type="checkbox"
                    checked={priceIncludesPPN}
                    onChange={(e) => setPriceIncludesPPN(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="priceIncludesPPN" className="ml-2 block text-sm text-gray-900">
                    Harga sudah termasuk PPN (11%)
                </label>
            </div>

            <div className="flex items-center">
                <input
                    id="isRecommended"
                    type="checkbox"
                    checked={isRecommended}
                    onChange={(e) => setIsRecommended(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="isRecommended" className="ml-2 block text-sm text-gray-900">
                    ⭐ Tandai sebagai Rekomendasi / Best Seller
                </label>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Deskripsi singkat paket..."
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fitur</label>
                <div className="flex space-x-2 mb-3">
                    <input
                        type="text"
                        value={newFeature}
                        onChange={(e) => setNewFeature(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                        placeholder="Tambah fitur..."
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                    <button
                        type="button"
                        onClick={addFeature}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        Tambah
                    </button>
                </div>
                <ul className="space-y-2">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="text-sm">{feature}</span>
                            <button
                                type="button"
                                onClick={() => removeFeature(index)}
                                className="text-red-600 hover:text-red-800"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="flex space-x-3">
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                    {loading ? 'Menyimpan...' : 'Simpan Paket'}
                </button>
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                    Batal
                </button>
            </div>
        </form>
    );
}
