'use client';

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Check, AlertCircle } from 'lucide-react';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

interface Province {
    id: string;
    name: string;
    isActive: boolean;
    _count?: {
        cities: number;
        users: number;
    };
}

export default function ProvinceTab() {
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    // Form state
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchProvinces();
    }, []);

    async function fetchProvinces() {
        try {
            setIsLoading(true);
            const res = await fetch('/api/locations/provinces');
            if (!res.ok) throw new Error('Failed to fetch provinces');
            const data = await res.json();
            setProvinces(data);
        } catch (err) {
            setError('Failed to load provinces');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.name.trim()) return;

        try {
            setIsSubmitting(true);
            setError(null);

            const url = '/api/locations/provinces';
            const method = editingId ? 'PUT' : 'POST';
            const body = editingId
                ? { id: editingId, name: formData.name }
                : { name: formData.name };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save province');
            }

            await fetchProvinces();
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
            setIsLoading(true);
            const res = await fetch(`/api/locations/provinces?id=${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete province');
            }

            await fetchProvinces();
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    }

    function resetForm() {
        setIsAdding(false);
        setEditingId(null);
        setFormData({ name: '' });
        setError(null);
    }

    function startEdit(province: Province) {
        setEditingId(province.id);
        setFormData({ name: province.name });
        setIsAdding(false);
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-gray-800">Provinces</h2>
                <button
                    onClick={() => {
                        setIsAdding(true);
                        setEditingId(null);
                        setFormData({ name: '' });
                    }}
                    disabled={isAdding || !!editingId}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    Add Province
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
                        {editingId ? 'Edit Province' : 'Add New Province'}
                    </h3>
                    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                        <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                Province Name
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Sulawesi Utara"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting || !formData.name.trim()}
                                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm flex items-center gap-2"
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
                            <th className="px-6 py-3 text-center">Cities</th>
                            <th className="px-6 py-3 text-center">Users</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {isLoading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    Loading provinces...
                                </td>
                            </tr>
                        ) : provinces.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                    No provinces found. Add one to get started.
                                </td>
                            </tr>
                        ) : (
                            provinces.map((province) => (
                                <tr key={province.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {province.name}
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {province._count?.cities || 0}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-gray-500">
                                        {province._count?.users || 0}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => startEdit(province)}
                                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                                title="Edit"
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(province.id)}
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
                title="Delete Province"
                message="Are you sure? This will delete all cities and districts in this province! This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
            />
        </div>
    );
}
