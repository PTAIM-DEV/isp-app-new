'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function EditPromoPage({ params }: PageProps) {
    const router = useRouter();
    const [id, setId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        type: 'DISCOUNT_PERCENT',
        value: '',
        cycleDuration: '',
        applicableToFlowIds: '[]',
        applicableToPackageIds: '[]',
        validFrom: '',
        validUntil: '',
        maxUses: '',
        isActive: true,
    });

    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        params.then(p => {
            setId(p.id);
            fetchPromo(p.id);
        });
    }, [params]);

    async function fetchPromo(promoId: string) {
        try {
            const response = await fetch(`/api/promos/${promoId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    notFound();
                }
                throw new Error('Failed to fetch promo');
            }
            const promo = await response.json();
            setFormData({
                code: promo.code,
                name: promo.name,
                description: promo.description || '',
                type: promo.type,
                value: promo.value ? String(promo.value) : '',
                cycleDuration: promo.cycleDuration ? String(promo.cycleDuration) : '',
                applicableToFlowIds: promo.applicableToFlowIds || '[]',
                applicableToPackageIds: promo.applicableToPackageIds || '[]',
                validFrom: promo.validFrom ? new Date(promo.validFrom).toISOString().split('T')[0] : '',
                validUntil: promo.validUntil ? new Date(promo.validUntil).toISOString().split('T')[0] : '',
                maxUses: promo.maxUses ? String(promo.maxUses) : '',
                isActive: promo.isActive,
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            setFetching(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!id) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/promos/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    value: formData.value ? parseFloat(formData.value) : null,
                    cycleDuration: formData.cycleDuration ? parseInt(formData.cycleDuration) : null,
                    validUntil: formData.validUntil || null,
                    maxUses: formData.maxUses ? parseInt(formData.maxUses) : null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Gagal mengupdate promo');
            }

            router.push('/admin/promos');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
            setLoading(false);
        }
    }

    function handleDeleteClick() {
        setShowConfirm(true);
    }

    async function handleConfirmDelete() {
        if (!id) return;
        setShowConfirm(false);

        try {
            const response = await fetch(`/api/promos/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Gagal menghapus promo');
            }

            router.push('/admin/promos');
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        }
    }

    if (fetching) {
        return <div className="text-center py-8">Loading...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Edit Promo Code</h2>
                <Link href="/admin/promos" className="text-indigo-600 hover:text-indigo-900">
                    &larr; Kembali
                </Link>
            </div>

            <form onSubmit={handleSubmit} className="bg-white shadow sm:rounded-lg p-6 space-y-6">
                {error && (
                    <div className="rounded-md bg-red-50 p-4">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Kode Promo *</label>
                    <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm font-mono"
                        placeholder="PROMO123"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Nama Promo *</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Tipe Promo *</label>
                    <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                        <option value="DISCOUNT_PERCENT">Diskon Persentase</option>
                        <option value="DISCOUNT_AMOUNT">Diskon Nominal</option>
                        <option value="FREE_INSTALLATION">Gratis Instalasi</option>
                        <option value="BONUS_MONTHS">Bonus Bulan</option>
                    </select>
                </div>

                {(formData.type === 'DISCOUNT_PERCENT' || formData.type === 'DISCOUNT_AMOUNT' || formData.type === 'BONUS_MONTHS') && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Nilai {formData.type === 'DISCOUNT_PERCENT' ? '(%)' : formData.type === 'DISCOUNT_AMOUNT' ? '(Rp)' : '(Bulan)'} *
                        </label>
                        <input
                            type="number"
                            required
                            value={formData.value}
                            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                    </div>
                )}

                {formData.type === 'BONUS_MONTHS' && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Durasi Cycle Berbayar (Bulan) *
                        </label>
                        <input
                            type="number"
                            required
                            value={formData.cycleDuration}
                            onChange={(e) => setFormData({ ...formData, cycleDuration: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            placeholder="Contoh: 6 (untuk bayar 6 bulan)"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            Berapa bulan yang harus dibayar di muka untuk mendapatkan bonus bulan gratis
                        </p>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700">Berlaku Dari *</label>
                    <input
                        type="date"
                        required
                        value={formData.validFrom}
                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Berlaku Sampai (Opsional)</label>
                    <input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Maksimal Penggunaan (Opsional)</label>
                    <input
                        type="number"
                        value={formData.maxUses}
                        onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        placeholder="Kosongkan untuk unlimited"
                    />
                </div>

                <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="isActive"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                            Aktif
                        </label>
                    </div>
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                        Nonaktifkan Promo
                    </button>
                    <div className="flex space-x-3">
                        <Link
                            href="/admin/promos"
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            Batal
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    </div>
                </div>
            </form>

            <ConfirmationDialog
                isOpen={showConfirm}
                onClose={() => setShowConfirm(false)}
                onConfirm={handleConfirmDelete}
                title="Nonaktifkan Promo"
                message="Apakah Anda yakin ingin menonaktifkan promo ini?"
                confirmLabel="Nonaktifkan"
                variant="danger"
            />
        </div>
    );
}
