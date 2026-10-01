'use client';

import { useState, useEffect } from 'react';
import { User, Role, UserStatus } from '@prisma/client'; // Types
import { updateUserRole, deleteUser, createUser, updateUser } from './actions';
import { Trash2, Edit, Plus, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

interface UserListProps {
    initialUsers: any[];
    currentSearch?: string;
    currentRole?: string;
    currentStatus?: string;
}

export default function UserList({ initialUsers }: UserListProps) {
    const [users, setUsers] = useState(initialUsers);

    // Create State
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Edit State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null); // State for user being edited

    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);

    // Filter State
    const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
    const [roleFilter, setRoleFilter] = useState(searchParams.get('role') || 'ALL');
    const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'ALL');

    useEffect(() => {
        setUsers(initialUsers);
    }, [initialUsers]);

    // Debounce Search & Filter Update
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());

            // Search
            if (searchTerm) params.set('q', searchTerm);
            else params.delete('q');

            // Role
            if (roleFilter && roleFilter !== 'ALL') params.set('role', roleFilter);
            else params.delete('role');

            // Status
            if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
            else params.delete('status');

            router.push(`?${params.toString()}`);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm, roleFilter, statusFilter, router, searchParams]);

    // Form State (Shared for Create/Edit - we could separate but reusing structure is fine)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'FINANCE' as any as Role
    });

    // Reset form when opening Add
    const openAddModal = () => {
        setFormData({ name: '', email: '', phone: '', password: '', role: 'FINANCE' as any as Role });
        setIsAddOpen(true);
    };

    // Populate form when opening Edit
    const openEditModal = (user: any) => {
        // Prevent event propagation if triggered from row
        setSelectedUser(user);
        setFormData({
            name: user.name,
            email: user.email || '',
            phone: user.phone,
            password: '', // blank for edit means no change
            role: user.role
        });
        setIsEditOpen(true);
    };

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Stop row click
        if (!confirm('Are you sure you want to delete this user?')) return;
        await deleteUser(id);
        router.refresh(); // Refresh server data
    };

    const handleRoleChange = async (e: React.MouseEvent, id: string, newRole: Role) => {
        e.stopPropagation(); // Stop row click
        await updateUserRole(id, newRole);
        router.refresh();
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const res = await createUser(formData);
        setIsLoading(false);
        if (res.success) {
            setIsAddOpen(false);
            router.refresh(); // Server re-render
        } else {
            alert(res.error);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUser) return;
        setIsLoading(true);
        const res = await updateUser(selectedUser.id, formData);
        setIsLoading(false);
        if (res.success) {
            setIsEditOpen(false);
            setSelectedUser(null);
            router.refresh();
        } else {
            alert(res.error);
        }
    };

    return (
        <div>
            {/* Toolbar */}
            <div className="p-4 border-b flex justify-between items-center gap-4">
                <div className="relative max-w-sm w-full">
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">All Roles</option>
                        {Object.values(Role).map(r => (
                            <option key={r} value={r}>{r}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="ALL">All Status</option>
                        {Object.values(UserStatus).map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                        <option value="DELETED">DELETED</option>
                    </select>
                </div>

                <button
                    onClick={openAddModal}
                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 whitespace-nowrap"
                >
                    <Plus size={16} /> Add User
                </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {initialUsers.map((user) => (
                            <tr
                                key={user.id}
                                onClick={() => openEditModal(user)}
                                className={`cursor-pointer transition-colors ${user.deletedAt ? 'bg-red-50 hover:bg-red-100 opacity-75' : 'hover:bg-indigo-50'}`}
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{user.name} {user.deletedAt && <span className="text-red-500 text-xs">(Deleted)</span>}</div>
                                    <div className="text-sm text-gray-500">{user.email}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <select
                                        value={user.role}
                                        onClick={(e) => e.stopPropagation()} // Prevent row click
                                        onChange={(e) => handleRoleChange(e as any, user.id, e.target.value as Role)}
                                        className="text-sm border-gray-300 rounded shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                                    >
                                        {Object.values(Role).map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {user.phone}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {user.deletedAt ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                            DELETED
                                        </span>
                                    ) : (
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {user.status}
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={(e) => handleDelete(e, user.id)} className="text-red-600 hover:text-red-900 ml-4">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Add New User</h3>
                            <button onClick={() => setIsAddOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleCreate} className="space-y-4">
                            {/* Reusable Form Fields */}
                            <div>
                                <label className="block text-sm font-medium">Name</label>
                                <input required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Email</label>
                                <input type="email" required className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Phone</label>
                                <input required className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Password</label>
                                <input type="password" required className="w-full border p-2 rounded" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Role</label>
                                <select className="w-full border p-2 rounded" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as Role })}>
                                    {Object.values(Role).map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-2 rounded">
                                {isLoading ? 'Creating...' : 'Create User'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Modal (Could extract Form to component to DRY) */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Edit User</h3>
                            <button onClick={() => setIsEditOpen(false)}><X /></button>
                        </div>
                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Name</label>
                                <input required className="w-full border p-2 rounded" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Email</label>
                                <input type="email" required className="w-full border p-2 rounded" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Phone</label>
                                <input required className="w-full border p-2 rounded" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Password (Leave blank to keep current)</label>
                                <input type="password" className="w-full border p-2 rounded" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} placeholder="******" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Role</label>
                                <select className="w-full border p-2 rounded" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as Role })}>
                                    {Object.values(Role).map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-2 rounded">
                                {isLoading ? 'Updating...' : 'Update User'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
