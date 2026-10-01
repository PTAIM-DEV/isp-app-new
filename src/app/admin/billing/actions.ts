'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function softDeleteInvoice(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
        });

        if (!invoice) {
            return { success: false, error: 'Invoice tidak ditemukan' };
        }

        if (invoice.status === 'PAID') {
            return { success: false, error: 'Invoice yang sudah dibayar tidak bisa dihapus' };
        }

        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                deletedAt: new Date(),
            },
        });

        revalidatePath('/admin/billing');
        return { success: true };
    } catch (error) {
        console.error('Soft delete invoice error:', error);
        return { success: false, error: 'Gagal menghapus invoice' };
    }
}

import { createInvoice } from '@/lib/xendit';

export async function recreateXenditInvoice(invoiceId: string) {
    try {
        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                user: {
                    include: {
                        province: true,
                        city: true,
                    }
                }
            }
        });

        if (!invoice) {
            return { success: false, error: 'Invoice tidak ditemukan' };
        }

        if (invoice.status === 'PAID') {
            return { success: false, error: 'Invoice sudah dibayar' };
        }

        const user = invoice.user;
        const newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + 10); // 10 days expiry

        // Create unique external ID to avoid duplicates in Xendit
        const timestamp = Math.floor(Date.now() / 1000);
        const externalId = `${invoice.invoiceNumber || invoice.id}-${timestamp}`;

        const xenditInvoice = await createInvoice({
            externalId: externalId,
            amount: Number(invoice.amount),
            description: invoice.description || `Invoice #${invoice.invoiceNumber || invoice.id}`,
            customerName: user.name,
            customerEmail: user.email || '',
            customerPhone: user.phone,
            customerAddress: user.address || 'Alamat tidak tersedia',
            itemName: invoice.description || 'Internet Subscription',
            itemPrice: Number(invoice.amount),
            itemQuantity: 1,
            provinceName: user.province?.name,
            cityName: user.city?.name,
            postalCode: user.postalCode || undefined
        });

        await prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: 'UNPAID', // Reset status
                dueDate: newDueDate,
                xenditId: xenditInvoice.id,
                xenditUrl: xenditInvoice.invoice_url,
                collectionStatus: 'COLLECTING' // Reset collection status if needed
            }
        });

        revalidatePath('/admin/billing');
        return { success: true, newUrl: xenditInvoice.invoice_url };

    } catch (error: any) {
        console.error('Recreate invoice error:', error);
        return { success: false, error: error.message || 'Gagal membuat invoice baru' };
    }
}
