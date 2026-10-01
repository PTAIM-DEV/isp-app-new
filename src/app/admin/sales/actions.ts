'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveSales(formData: FormData, id?: string) {
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const status = formData.get('status') as string;

    try {
        if (id) {
            await prisma.user.update({
                where: { id },
                data: { name, phone, email, status: status as any },
            });
        } else {
            await prisma.user.create({
                data: {
                    name,
                    phone,
                    email: email || undefined,
                    status: status as any,
                    role: 'SALES'
                },
            });
        }

        revalidatePath('/admin/sales');
        return { success: true };
    } catch (error) {
        console.error('Save sales error:', error);
        return { success: false, error: 'Gagal menyimpan data sales.' };
    }
}

export async function deleteSales(id: string) {
    try {
        // Check if sales has users assigned (salesCustomers)
        const sales = await prisma.user.findUnique({
            where: { id },
            include: { _count: { select: { salesCustomers: true } } }
        });

        if (!sales) {
            return { success: false, error: 'Data sales tidak ditemukan.' };
        }

        if (sales._count.salesCustomers > 0) {
            return { success: false, error: 'Tidak dapat menghapus sales yang masih memiliki pelanggan.' };
        }

        // Soft delete user instead of hard delete to preserve history if needed?
        // Or hard delete if strictly requested? The original code did hard delete Sales.
        // But User often has other relations.
        // Let's safe-delete (soft delete) or check all relations.
        // For now, let's just Soft Delete (mark inactive/deletedAt) to be safe for User table.
        await prisma.user.update({
            where: { id },
            data: { deletedAt: new Date(), status: 'INACTIVE' }
        });

        revalidatePath('/admin/sales');
        return { success: true };
    } catch (error) {
        console.error('Delete sales error:', error);
        return { success: false, error: 'Gagal menghapus data sales.' };
    }
}











