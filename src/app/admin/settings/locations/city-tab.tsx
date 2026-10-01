'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Check, AlertCircle } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface Province {
    id: string;
    name: string;
}

interface City {
    id: string;
    name: string;
    provinceId: string;
    province: Province;
    isActive: boolean;
    _count?: {
        districts: number;
        users: number;
    };
}

export default function CityTab() {
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
    const [cities, setCities] = useState<City[]>([]);

    const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Form state
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', provinceId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchProvinces();
    }, []);

    useEffect(() => {
        if (selectedProvinceId) {
            fetchCities(selectedProvinceId);
        } else {
            setCities([]);
        }
    }, [selectedProvinceId]);

    async function fetchProvinces() {
        try {
            setIsLoadingProvinces(true);
            const res = await fetch('/api/locations/provinces');
            if (!res.ok) throw new Error('Failed to fetch provinces');
            const data = await res.json();
            setProvinces(data);

            // Select first province by default if available
            if (data.length > 0 && !selectedProvinceId) {
                setSelectedProvinceId(data[0].id);
            }
        } catch (err) {
            setError('Failed to load provinces');
            console.error(err);
        } finally {
            setIsLoadingProvinces(false);
        }
    }

    async function fetchCities(provinceId: string) {
        try {
            setIsLoadingCities(true);
            const res = await fetch(`/api/locations/cities?provinceId=${provinceId}`);
            if (!res.ok) throw new Error('Failed to fetch cities');
            const data = await res.json();
            setCities(data);
        } catch (err) {
            setError('Failed to load cities');
            console.error(err);
        } finally {
            setIsLoadingCities(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.name.trim() || !formData.provinceId) return;

        try {
            setIsSubmitting(true);
            setError(null);

            const url = '/api/locations/cities';
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId
                ? { id: editingId, name: formData.name, provinceId: formData.provinceId }
                : { name: formData.name, provinceId: formData.provinceId };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save city');
            }

            await fetchCities(selectedProvinceId);
            resetForm();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleDeleteClick(id: string) {
        setDeleteConfirm(id);
    }

    async function handleConfirmDelete() {
        if (!deleteConfirm) return;

        const id = deleteConfirm;
        setDeleteConfirm(null);

        try {
            setIsLoadingCities(true);
            const res = await fetch(`/api/locations/cities?id=${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete city');
            }

            await fetchCities(selectedProvinceId);
        } catch (err: any) {
            setError(err.message);
            setIsLoadingCities(false);
        }
    }

    function resetForm() {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', provinceId: selectedProvinceId });
        setError(null);
    }

    function startEdit(city: City) {
        setEditingId(city.id);
        setFormData({ name: city.name, provinceId: city.provinceId });
        setIsAdding(false);
    }

    if (isLoadingProvinces) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
        );
    }

    if (provinces.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-gray-500">Please add a Province first.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <h2 className="text-lg font-semibold text-gray-800 whitespace-nowrap">Cities</h2>

                    {/* Province Filter */}
                    <select
                        value={selectedProvinceId}
                        onChange={(e) => setSelectedProvinceId(e.target.value)}
                        className="block w-full sm:w-64 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                    >
                        {provinces.map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setFormData({ name: '', provinceId: selectedProvinceId });
                    }}
                    disabled={isAdding || !!editingId || !selectedProvinceId}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium w-full sm:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" />
                    Add City
                </button>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-red-700">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Add/Edit Form */}
            {(isAdding || editingId) && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                        {editingId ? 'Edit City' : 'Add New City'}
                    </h3>
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="w-full sm:w-1/3">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Province
                            </label>
                            <select
                                value={formData.provinceId}
                                onChange={(e) => setFormData({ ...formData, provinceId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                disabled={!!editingId} // Disable province change on edit for simplicity
                            >
                                {provinces.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                City Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Kab. Minahasa Utara"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex-1 sm:flex-none px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.name.trim()}
                                className="flex-1 sm:flex-none px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Save
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* List */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3 text-center">Districts</th>
                            <th className="px-6 py-3 text-center">Users</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {isLoadingCities ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading cities...
                                </td>
                            </tr>
                        ) : cities.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    No cities found in this province.
                                </td>
                            </tr>
                        ) : (
                            cities.map((city) => (
                                <tr key={city.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {city.name}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {city._count?.districts || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        {city._count?.users || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => startEdit(city)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(city.id)}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmationDialog
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleConfirmDelete}
                title="Delete City"
                message="Are you sure? This will delete all districts in this city! This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
            />
        </div>
    );
}
