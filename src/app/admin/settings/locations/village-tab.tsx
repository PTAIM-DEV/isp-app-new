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
}

interface District {
    id: string;
    name: string;
    cityId: string;
}

interface Village {
    id: string;
    name: string;
    districtId: string;
    isActive: boolean;
    _count?: {
        users: number;
    };
}

export default function VillageTab() {
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [villages, setVillages] = useState<Village[]>([]);

    const [selectedProvinceId, setSelectedProvinceId] = useState<string>('');
    const [selectedCityId, setSelectedCityId] = useState<string>('');
    const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');

    const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
    const [isLoadingVillages, setIsLoadingVillages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Form state
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', districtId: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load provinces on mount
    useEffect(() => {
        fetchProvinces();
    }, []);

    // Load cities when province changes
    useEffect(() => {
        if (selectedProvinceId) {
            fetchCities(selectedProvinceId);
        } else {
            setCities([]);
            setSelectedCityId('');
            setDistricts([]);
            setSelectedDistrictId('');
            setVillages([]);
        }
    }, [selectedProvinceId]);

    // Load districts when city changes
    useEffect(() => {
        if (selectedCityId) {
            fetchDistricts(selectedCityId);
        } else {
            setDistricts([]);
            setSelectedDistrictId('');
            setVillages([]);
        }
    }, [selectedCityId]);

    // Load villages when district changes
    useEffect(() => {
        if (selectedDistrictId) {
            fetchVillages(selectedDistrictId);
        } else {
            setVillages([]);
        }
    }, [selectedDistrictId]);

    async function fetchProvinces() {
        try {
            setIsLoadingProvinces(true);
            const res = await fetch('/api/locations/provinces');
            if (!res.ok) throw new Error('Failed to fetch provinces');
            const data = await res.json();
            setProvinces(data);

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

            if (data.length > 0) {
                setSelectedCityId(data[0].id);
            } else {
                setSelectedCityId('');
            }
        } catch (err) {
            setError('Failed to load cities');
            console.error(err);
        } finally {
            setIsLoadingCities(false);
        }
    }

    async function fetchDistricts(cityId: string) {
        try {
            setIsLoadingDistricts(true);
            const res = await fetch(`/api/locations/districts?cityId=${cityId}`);
            if (!res.ok) throw new Error('Failed to fetch districts');
            const data = await res.json();
            setDistricts(data);

            if (data.length > 0) {
                setSelectedDistrictId(data[0].id);
            } else {
                setSelectedDistrictId('');
            }
        } catch (err) {
            setError('Failed to load districts');
            console.error(err);
        } finally {
            setIsLoadingDistricts(false);
        }
    }

    async function fetchVillages(districtId: string) {
        try {
            setIsLoadingVillages(true);
            const res = await fetch(`/api/locations/villages?districtId=${districtId}`);
            if (!res.ok) throw new Error('Failed to fetch villages');
            const data = await res.json();
            setVillages(data);
        } catch (err) {
            setError('Failed to load villages');
            console.error(err);
        } finally {
            setIsLoadingVillages(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.name.trim() || !formData.districtId) return;

        try {
            setIsSubmitting(true);
            setError(null);

            const url = '/api/locations/villages';
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId
                ? { id: editingId, name: formData.name, districtId: formData.districtId }
                : { name: formData.name, districtId: formData.districtId };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save village');
            }

            await fetchVillages(selectedDistrictId);
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
            setIsLoadingVillages(true);
            const res = await fetch(`/api/locations/villages?id=${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete village');
            }

            await fetchVillages(selectedDistrictId);
        } catch (err: any) {
            setError(err.message);
            setIsLoadingVillages(false);
        }
    }

    function resetForm() {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '', districtId: selectedDistrictId });
        setError(null);
    }

    function startEdit(village: Village) {
        setEditingId(village.id);
        setFormData({ name: village.name, districtId: village.districtId });
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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto flex-wrap">
                    <h2 className="text-lg font-semibold text-gray-800 whitespace-nowrap">Villages</h2>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto flex-wrap">
                        {/* Province Filter */}
                        <select
                            value={selectedProvinceId}
                            onChange={(e) => setSelectedProvinceId(e.target.value)}
                            className="block w-full sm:w-40 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                        >
                            {provinces.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.name}
                                </option>
                            ))}
                        </select>

                        {/* City Filter */}
                        <select
                            value={selectedCityId}
                            onChange={(e) => setSelectedCityId(e.target.value)}
                            disabled={cities.length === 0}
                            className="block w-full sm:w-40 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            {cities.length === 0 ? (
                                <option>No cities</option>
                            ) : (
                                cities.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))
                            )}
                        </select>

                        {/* District Filter */}
                        <select
                            value={selectedDistrictId}
                            onChange={(e) => setSelectedDistrictId(e.target.value)}
                            disabled={districts.length === 0}
                            className="block w-full sm:w-40 pl-3 pr-8 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md disabled:bg-gray-100 disabled:text-gray-400"
                        >
                            {districts.length === 0 ? (
                                <option>No districts</option>
                            ) : (
                                districts.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))
                            )}
                        </select>
                    </div>
                </div>

                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setFormData({ name: '', districtId: selectedDistrictId });
                    }}
                    disabled={isAdding || !!editingId || !selectedDistrictId}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium w-full lg:w-auto justify-center"
                >
                    <Plus className="w-4 h-4" />
                    Add Village
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
                        {editingId ? 'Edit Village' : 'Add New Village'}
                    </h3>
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 items-end">
                        <div className="w-full sm:w-1/3">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                District
                            </label>
                            <select
                                value={formData.districtId}
                                onChange={(e) => setFormData({ ...formData, districtId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                disabled={!!editingId}
                            >
                                {districts.map((d) => (
                                    <option key={d.id} value={d.id}>
                                        {d.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Village Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Sukur"
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
                            <th className="px-6 py-3 text-center">Users</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {isLoadingVillages ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading villages...
                                </td>
                            </tr>
                        ) : villages.length === 0 ? (
                            <tr>
                                <td colSpan={3} className="px-6 py-8 text-center text-gray-500">
                                    {selectedDistrictId ? 'No villages found in this district.' : 'Please select a district.'}
                                </td>
                            </tr>
                        ) : (
                            villages.map((village) => (
                                <tr key={village.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {village.name}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        {village._count?.users || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => startEdit(village)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(village.id)}
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
                title="Delete Village"
                message="Are you sure you want to delete this village? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
            />
        </div>
    );
}
