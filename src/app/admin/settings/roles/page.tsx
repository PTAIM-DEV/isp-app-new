'use client';

import { useState, useEffect } from 'react';
import { Role } from '@prisma/client';
import { getRolePermissions, updateRolePermissions } from './actions';
import { MODULES, MODULE_LABELS, ModuleType } from '@/lib/permissions';

export default function RolePermissionsPage() {
    const [selectedRole, setSelectedRole] = useState<Role>(Role.FINANCE);
    const [permissions, setPermissions] = useState<ModuleType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Fetch permissions when role changes
    useEffect(() => {
        async function fetchPermissions() {
            setIsLoading(true);
            const perms = await getRolePermissions(selectedRole);
            setPermissions(perms);
            setIsLoading(false);
        }
        fetchPermissions();
    }, [selectedRole]);

    const handleToggle = (module: ModuleType) => {
        setPermissions(prev =>
            prev.includes(module)
                ? prev.filter(p => p !== module)
                : [...prev, module]
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        const res = await updateRolePermissions(selectedRole, permissions);
        setIsSaving(false);
        if (res.success) {
            alert('Permissions updated successfully');
        } else {
            alert('Failed to update permissions');
        }
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-6">Role Permissions</h1>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Role Selector */}
                <div className="bg-white p-4 rounded shadow h-fit">
                    <h2 className="font-semibold mb-4">Select Role</h2>
                    <div className="space-y-2">
                        {Object.values(Role).filter(r => r !== 'ADMIN').map(role => (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                className={`w-full text-left px-4 py-2 rounded ${selectedRole === role ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:bg-gray-50'}`}
                            >
                                {role}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                        * ADMIN has full access by default.
                    </div>
                </div>

                {/* Permissions Toggles */}
                <div className="md:col-span-3 bg-white p-6 rounded shadow">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold">Permissions for {selectedRole}</h2>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || isLoading}
                            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-10">Loading permissions...</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.values(MODULES).map(module => (
                                <div key={module} className="border p-4 rounded flex items-start gap-3 hover:bg-gray-50 cursor-pointer" onClick={() => handleToggle(module)}>
                                    <input
                                        type="checkbox"
                                        checked={permissions.includes(module)}
                                        readOnly
                                        className="mt-1 h-4 w-4 text-blue-600 rounded cursor-pointer"
                                    />
                                    <div>
                                        <div className="font-medium text-gray-900">{MODULE_LABELS[module]}</div>
                                        <div className="text-xs text-gray-500 capitalize">{module} Access</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
