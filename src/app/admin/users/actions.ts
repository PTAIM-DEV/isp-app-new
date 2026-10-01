'use server';

import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';
import { Role, UserStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getUsers(query?: string, role?: string, status?: string) {
    const whereClause: any = {};

    // Filter Logic
    if (status === 'DELETED') {
        whereClause.deletedAt = { not: null };
    } else {
        // Default: Only active users unless searching or explicitly asking for deleted
        // If searching, we search ALL users to prevent "Hidden User" confusion
        if (!query) {
            whereClause.deletedAt = null;
        }
    }

    if (query) {
        whereClause.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { phone: { contains: query, mode: 'insensitive' } }
        ];
    }

    if (role && role !== 'ALL') {
        whereClause.role = role as Role;
    }

    if (status && status !== 'ALL') {
        whereClause.status = status as UserStatus;
    }

    return await prisma.user.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
            createdAt: true,
            deletedAt: true,
        }
    });
}

export async function createUser(data: { name: string; email: string; phone: string; role: Role; password?: string }) {
    try {
        const hashedPassword = data.password ? await hashPassword(data.password) : undefined;

        await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                phone: data.phone,
                role: data.role,
                status: UserStatus.ACTIVE, // Default active for admin created staff
                password: hashedPassword,
            }
        });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Create User Error:', error);
        return { success: false, error: 'Failed to create user. Email or Phone might be duplicate.' };
    }
}

export async function updateUser(userId: string, data: { name: string; email: string; phone: string; role: Role; password?: string }) {
    try {
        const updateData: any = {
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
        };

        if (data.password && data.password.trim() !== '') {
            updateData.password = await hashPassword(data.password);
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error: any) {
        console.error('Update User Error:', error);
        // Handle Unique Constraint Violation (P2002)
        if (error.code === 'P2002') {
            const fields = error.meta?.target || [];
            return { success: false, error: `Failed to update: ${fields.join(', ')} already exists.` };
        }
        return { success: false, error: 'Failed to update user' };
    }
}

export async function updateUserRole(userId: string, role: Role) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: { role }
        });
        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        return { success: false, error: 'Failed to update user role' };
    }
}

export async function deleteUser(userId: string) {
    try {
        // Soft delete: Change status, set deletedAt, and mutate unique fields to allow re-registration
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) return { success: false, error: 'User not found' };

        const timestamp = new Date().getTime();

        await prisma.user.update({
            where: { id: userId },
            data: {
                status: UserStatus.INACTIVE,
                deletedAt: new Date(),
                // Append timestamp to unique fields to release them
                email: user.email ? `deleted_${timestamp}_${user.email}` : undefined,
                phone: `deleted_${timestamp}_${user.phone}`,
                nik: user.nik ? `deleted_${timestamp}_${user.nik}` : undefined,
            }
        });

        revalidatePath('/admin/users');
        return { success: true };
    } catch (error) {
        console.error('Delete User Error:', error);
        return { success: false, error: 'Failed to delete user' };
    }
}
