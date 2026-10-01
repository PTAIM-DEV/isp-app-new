'use client';

import { useState } from 'react';
import { deletePackage, togglePackageStatus } from './actions';
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import Link from 'next/link';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface Package {
    id: string;
    name: string;
    speed: string;
    price: number;
    description: string | null;
    features: string;
    isActive: boolean;
}

export function PackageList({ packages }: { packages: Package[] }) {
    const [loading, setLoading] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

    function handleDeleteClick(id: string, name: string) {
        setDeleteConfirm({ id, name });
    }

    async function handleConfirmDelete() {
        if (!deleteConfirm) return;

        const { id } = deleteConfirm;
        setDeleteConfirm(null);
        setLoading(id);

        await deletePackage(id);
        setLoading(null);
    }

    async function handleToggle(id: string, currentStatus: boolean) {
        setLoading(id);
        await togglePackageStatus(id, !currentStatus);
        setLoading(null);
    }

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200">
                {packages.map((pkg) => {
                    const features = JSON.parse(pkg.features || '[]');

                    return (
                        <li key={pkg.id}>
                            <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center">
                                            <h3 className="text-lg font-medium text-indigo-600">{pkg.name}</h3>
                                            <span className={`ml-3 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${pkg.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {pkg.isActive ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-gray-500">
                                                    <span className="font-semibold mr-2">Kecepatan:</span> {pkg.speed}
                                                </p>
                                                <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                                                    <span className="font-semibold mr-2">Harga:</span> Rp {pkg.price.toLocaleString('id-ID')}/bulan
                                                </p>
                                            </div>
                                        </div>
                                        {pkg.description && (
                                            <p className="mt-2 text-sm text-gray-500">{pkg.description}</p>
                                        )}
                                        {features.length > 0 && (
                                            <ul className="mt-2 text-sm text-gray-500 list-disc list-inside">
                                                {features.map((feature: string, idx: number) => (
                                                    <li key={idx}>{feature}</li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                    <div className="ml-4 flex space-x-2">
                                        <button
                                            onClick={() => handleToggle(pkg.id, pkg.isActive)}
                                            disabled={loading === pkg.id}
                                            className="p-2 text-gray-400 hover:text-gray-500"
                                            title={pkg.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                                        >
                                            {pkg.isActive ? (
                                                <ToggleRight className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <ToggleLeft className="h-5 w-5" />
                                            )}
                                        </button>
                                        <Link
                                            href={`/admin/packages/${pkg.id}/edit`}
                                            className="p-2 text-indigo-600 hover:text-indigo-900"
                                        >
                                            <Pencil className="h-5 w-5" />
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteClick(pkg.id, pkg.name)}
                                            disabled={loading === pkg.id}
                                            className="p-2 text-red-600 hover:text-red-900"
                                        >
                                            <Trash2 className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </li>
                    );
                })}
                {packages.length === 0 && (
                    <li className="px-4 py-8 text-center text-gray-500">
                        Belum ada paket layanan. Klik "Tambah Paket" untuk membuat paket baru.
                    </li>
                )}
            </ul>

            <ConfirmationDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleConfirmDelete}
                title="Hapus Paket"
                message={`Apakah Anda yakin ingin menghapus paket "${deleteConfirm?.name}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmLabel="Hapus"
                variant="danger"
            />
        </div>
    );
}
