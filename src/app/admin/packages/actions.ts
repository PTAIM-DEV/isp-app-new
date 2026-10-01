// Admin - Service Package Management
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function savePackage(data: {
    id?: string;
    name: string;
    speed: string;
    price: number;
    description?: string;
    features: string[];
    priceIncludesPPN: boolean;
    isRecommended: boolean;
}) {
    try {
        const packageData = {
            name: data.name,
            speed: data.speed,
            price: data.price,
            description: data.description || '',
            features: JSON.stringify(data.features),
            priceIncludesPPN: data.priceIncludesPPN,
            isRecommended: data.isRecommended,
        };

        if (data.id) {
            await prisma.servicePackage.update({
                where: { id: data.id },
                data: packageData,
            });
        } else {
            await prisma.servicePackage.create({
                data: packageData,
            });
        }

        revalidatePath('/admin/packages');
        return { success: true };
    } catch (error) {
        console.error('Save package error:', error);
        return { success: false, error: 'Gagal menyimpan paket' };
    }
}

export async function deletePackage(id: string) {
    try {
        await prisma.servicePackage.delete({
            where: { id },
        });

        revalidatePath('/admin/packages');
        return { success: true };
    } catch (error) {
        console.error('Delete package error:', error);
        return { success: false, error: 'Gagal menghapus paket' };
    }
}

export async function togglePackageStatus(id: string, isActive: boolean) {
    try {
        await prisma.servicePackage.update({
            where: { id },
            data: { isActive },
        });

        revalidatePath('/admin/packages');
        return { success: true };
    } catch (error) {
        console.error('Toggle package error:', error);
        return { success: false, error: 'Gagal mengubah status paket' };
    }
}
