'use server';

import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ModuleType, DEFAULT_ROLE_PERMISSIONS } from '@/lib/permissions';

export async function getRolePermissions(role: Role) {
    // 1. Fetch custom permissions from DB
    const dbPermissions = await prisma.rolePermission.findMany({
        where: { role },
        select: { module: true }
    });

    // If no permissions found in DB, return defaults (but maybe we should seed them?)
    // For now, let's treat DB as the source of truth if it exists, otherwise fallback to defaults.
    // Actually, simpler: DB *overrides* or DB *is* the source?
    // Let's make DB the source. If empty, we might want to initialize it UI-side or here.

    if (dbPermissions.length === 0) {
        // Fallback to defaults defined in code
        return DEFAULT_ROLE_PERMISSIONS[role] || [];
    }

    return dbPermissions.map(p => p.module as ModuleType);
}

export async function updateRolePermissions(role: Role, modules: ModuleType[]) {
    try {
        // Transaction to replace permissions
        await prisma.$transaction(async (tx) => {
            // 1. Delete existing for this role
            await tx.rolePermission.deleteMany({
                where: { role }
            });

            // 2. Insert new ones
            if (modules.length > 0) {
                await tx.rolePermission.createMany({
                    data: modules.map(module => ({
                        role,
                        module
                    }))
                });
            }
        });

        revalidatePath('/admin');
        revalidatePath('/admin/settings/roles');
        return { success: true };
    } catch (error) {
        console.error('Update Permissions Error:', error);
        return { success: false, error: 'Failed to update permissions' };
    }
}
