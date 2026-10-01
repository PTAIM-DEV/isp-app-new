import { prisma } from '@/lib/prisma';
import { calculateTrialEndDate } from '@/lib/invoice-utils';

export async function activateSubscription(
    userId: string,
    prepaidMonths: number = 0,
    bonusMonths: number = 0
) {
    try {
        // Get user and package data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { subscription: true },
        });

        if (!user) {
            throw new Error('User not found');
        }

        if (!user.selectedPackageId || !user.assignedPaymentFlowId) {
            throw new Error('Package or Payment Flow not assigned');
        }

        const servicePackage = await prisma.servicePackage.findUnique({
            where: { id: user.selectedPackageId },
        });

        const paymentFlow = await prisma.paymentFlow.findUnique({
            where: { id: user.assignedPaymentFlowId },
        });

        if (!servicePackage || !paymentFlow) {
            throw new Error('Data package/flow tidak ditemukan');
        }

        const now = new Date();
        const activatedDate = now;

        // Calculate trial dates if trial is supported
        let trialStartDate: Date | null = null;
        let trialEndDate: Date | null = null;
        let isTrialActive = false;
        const actualTrialDays = paymentFlow.trialDays || 0;

        if (paymentFlow.supportsTrial && actualTrialDays > 0) {
            trialStartDate = activatedDate;
            trialEndDate = calculateTrialEndDate(activatedDate, actualTrialDays);
            isTrialActive = true;
        }

        // Calculate next billing date
        let nextBillingDate: Date | null = null;
        let isPrepaidActive = false;
        let prepaidValidUntil: Date | null = null;

        if (isTrialActive && trialEndDate) {
            nextBillingDate = trialEndDate;
        } else if (prepaidMonths > 0) {
            // Prepaid logic
            isPrepaidActive = true;
            const totalMonths = prepaidMonths + bonusMonths;

            nextBillingDate = new Date(now);
            nextBillingDate.setMonth(nextBillingDate.getMonth() + totalMonths);

            prepaidValidUntil = nextBillingDate;
        } else if (!paymentFlow.requiresFirstMonthPayment) {
            // If no first month payment needed (prepaid), set to null for now
            nextBillingDate = null;
        } else {
            // Regular monthly billing
            // If we are activating AFTER payment, the "First Month" is already paid.
            // So the next billing date should be 1 month from now?
            // OR, does the First Month cover the next 30 days? Yes.
            // So Next Billing Date = Now + 30 days.

            nextBillingDate = new Date(now);
            // If flow says "First Month Payment After Install", it means we just paid it.
            // So we are covered for 30 days.
            const daysToAdd = paymentFlow.firstMonthPaymentAfterInstall ? 7 : 30;
            nextBillingDate.setDate(nextBillingDate.getDate() + daysToAdd);
        }

        // Create or update subscription
        await prisma.subscription.upsert({
            where: { userId },
            create: {
                userId,
                planName: servicePackage.name,
                price: servicePackage.price,
                billingCycle: 30,
                startDate: now,
                activatedDate,
                trialStartDate,
                trialEndDate,
                nextBillingDate,
                paymentFlowId: paymentFlow.id,
                isTrialActive,
                isPrepaidActive,
                prepaidCreditMonths: prepaidMonths,
                bonusMonthsPending: bonusMonths,
                prepaidValidUntil,
            },
            update: {
                planName: servicePackage.name,
                price: servicePackage.price,
                activatedDate,
                trialStartDate,
                trialEndDate,
                nextBillingDate,
                paymentFlowId: paymentFlow.id,
                isTrialActive,
                isPrepaidActive,
                prepaidCreditMonths: prepaidMonths,
                bonusMonthsPending: bonusMonths,
                prepaidValidUntil,
            },
        });

        // Update user status
        await prisma.user.update({
            where: { id: userId },
            data: {
                status: 'ACTIVE',
                role: 'CUSTOMER',
            },
        });

        return { success: true };
    } catch (error: any) {
        console.error('Activate subscription error:', error);
        return { success: false, error: error.message };
    }
}
