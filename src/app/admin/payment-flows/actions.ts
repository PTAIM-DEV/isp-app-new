'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createPaymentFlow(formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const requiresInstallationPayment = formData.get('requiresInstallationPayment') === 'on';
    const installationFeeAmount = Number(formData.get('installationFeeAmount') || 0);
    const freeInstallation = formData.get('freeInstallation') === 'on';
    const requiresFirstMonthPayment = formData.get('requiresFirstMonthPayment') === 'on';
    const firstMonthPaymentAfterInstall = formData.get('firstMonthPaymentAfterInstall') === 'on';
    const supportsTrial = formData.get('supportsTrial') === 'on';
    const trialDays = Number(formData.get('trialDays') || 0);

    try {
        await prisma.paymentFlow.create({
            data: {
                name,
                description,
                requiresInstallationPayment,
                installationFeeAmount,
                freeInstallation,
                requiresFirstMonthPayment,
                firstMonthPaymentAfterInstall,
                supportsTrial,
                trialDays: supportsTrial ? trialDays : null,
            },
        });
    } catch (error) {
        console.error('Create payment flow error:', error);
        return { success: false, error: 'Gagal membuat payment flow' };
    }

    revalidatePath('/admin/payment-flows');
    redirect('/admin/payment-flows');
}

export async function updatePaymentFlow(id: string, formData: FormData) {
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;
    const requiresInstallationPayment = formData.get('requiresInstallationPayment') === 'on';
    const installationFeeAmount = Number(formData.get('installationFeeAmount') || 0);
    const freeInstallation = formData.get('freeInstallation') === 'on';
    const requiresFirstMonthPayment = formData.get('requiresFirstMonthPayment') === 'on';
    const firstMonthPaymentAfterInstall = formData.get('firstMonthPaymentAfterInstall') === 'on';
    const supportsTrial = formData.get('supportsTrial') === 'on';
    const trialDays = Number(formData.get('trialDays') || 0);
    const isActive = formData.get('isActive') === 'on';

    try {
        await prisma.paymentFlow.update({
            where: { id },
            data: {
                name,
                description,
                requiresInstallationPayment,
                installationFeeAmount,
                freeInstallation,
                requiresFirstMonthPayment,
                firstMonthPaymentAfterInstall,
                supportsTrial,
                trialDays: supportsTrial ? trialDays : null,
                isActive,
            },
        });
    } catch (error) {
        console.error('Update payment flow error:', error);
        return { success: false, error: 'Gagal update payment flow' };
    }

    revalidatePath('/admin/payment-flows');
    redirect('/admin/payment-flows');
}

export async function deletePaymentFlow(id: string) {
    try {
        await prisma.paymentFlow.delete({
            where: { id },
        });
        revalidatePath('/admin/payment-flows');
        return { success: true };
    } catch (error) {
        console.error('Delete payment flow error:', error);
        return { success: false, error: 'Gagal menghapus payment flow' };
    }
}
