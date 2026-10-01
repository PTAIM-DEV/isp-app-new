import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type TimeRange = '1D' | '7D' | '14D' | '1M' | '3M' | '6M' | '1Y' | 'YTD' | 'ALL';

/**
 * Helper function to format date for grouping (per day)
 */
function formatDateForGrouping(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Helper function to format day label
 */
function formatDayLabel(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${day} ${monthNames[parseInt(month) - 1]}`;
}

/**
 * Calculate start date based on time range
 */
function getStartDate(range: TimeRange): Date {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const startDate = new Date(now);

    switch (range) {
        case '1D':
            // Today only
            return startDate;
        case '7D':
            startDate.setDate(startDate.getDate() - 7);
            return startDate;
        case '14D':
            startDate.setDate(startDate.getDate() - 14);
            return startDate;
        case '1M':
            startDate.setMonth(startDate.getMonth() - 1);
            return startDate;
        case '3M':
            startDate.setMonth(startDate.getMonth() - 3);
            return startDate;
        case '6M':
            startDate.setMonth(startDate.getMonth() - 6);
            return startDate;
        case '1Y':
            startDate.setFullYear(startDate.getFullYear() - 1);
            return startDate;
        case 'YTD':
            startDate.setMonth(0);
            startDate.setDate(1);
            return startDate;
        case 'ALL':
            // Return very old date
            return new Date(2000, 0, 1);
        default:
            startDate.setDate(startDate.getDate() - 30);
            return startDate;
    }
}

/**
 * Get dashboard chart data based on time range
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const range = (searchParams.get('range') || '1M') as TimeRange;

        const startDate = getStartDate(range);
        const now = new Date();
        now.setHours(23, 59, 59, 999);

        // Get data for customer growth by registration date
        const allUsers = await prisma.user.findMany({
            where: {
                role: 'CUSTOMER',
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                createdAt: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Get data for customer activation
        const subscriptions = await prisma.subscription.findMany({
            where: {
                activatedDate: {
                    not: null,
                    gte: startDate,
                },
            },
            select: {
                activatedDate: true,
            },
            orderBy: {
                activatedDate: 'asc',
            },
        });

        // Get revenue data (paid invoices)
        const paidInvoices = await prisma.invoice.findMany({
            where: {
                status: 'PAID',
                paidAt: {
                    not: null,
                    gte: startDate,
                },
            },
            select: {
                amount: true,
                paidAt: true,
            },
        });

        // Get invoice creation data
        const allInvoicesCreated = await prisma.invoice.findMany({
            where: {
                deletedAt: null,
                createdAt: {
                    gte: startDate,
                },
            },
            select: {
                createdAt: true,
                invoiceNumber: true,
            },
            orderBy: {
                createdAt: 'asc',
            },
        });

        // Get overdue invoices data
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                status: 'OVERDUE',
                updatedAt: {
                    gte: startDate,
                },
            },
            select: {
                updatedAt: true,
            },
        });

        // Get blocked users data
        const blockedUsers = await prisma.user.findMany({
            where: {
                status: 'BLOCKED',
                updatedAt: {
                    gte: startDate,
                },
            },
            select: {
                updatedAt: true,
            },
        });

        // Get terminated/churned users data
        const terminatedUsers = await prisma.user.findMany({
            where: {
                status: 'INACTIVE',
                updatedAt: {
                    gte: startDate,
                },
            },
            select: {
                updatedAt: true,
            },
        });

        // Group by day
        const registrationByDay: Record<string, number> = {};
        allUsers.forEach((user) => {
            const dayKey = formatDateForGrouping(user.createdAt);
            registrationByDay[dayKey] = (registrationByDay[dayKey] || 0) + 1;
        });

        const activationByDay: Record<string, number> = {};
        subscriptions.forEach((sub) => {
            if (sub.activatedDate) {
                const dayKey = formatDateForGrouping(sub.activatedDate);
                activationByDay[dayKey] = (activationByDay[dayKey] || 0) + 1;
            }
        });

        const revenueByDay: Record<string, number> = {};
        paidInvoices.forEach((invoice) => {
            if (invoice.paidAt) {
                const dayKey = formatDateForGrouping(invoice.paidAt);
                const amount = Number(invoice.amount);
                revenueByDay[dayKey] = (revenueByDay[dayKey] || 0) + amount;
            }
        });

        const invoiceByDay: Record<string, number> = {};
        allInvoicesCreated.forEach((invoice) => {
            const dayKey = formatDateForGrouping(invoice.createdAt);
            invoiceByDay[dayKey] = (invoiceByDay[dayKey] || 0) + 1;
        });

        const overdueByDay: Record<string, number> = {};
        overdueInvoices.forEach((invoice) => {
            const dayKey = formatDateForGrouping(invoice.updatedAt);
            overdueByDay[dayKey] = (overdueByDay[dayKey] || 0) + 1;
        });

        const blockedByDay: Record<string, number> = {};
        blockedUsers.forEach((user) => {
            const dayKey = formatDateForGrouping(user.updatedAt);
            blockedByDay[dayKey] = (blockedByDay[dayKey] || 0) + 1;
        });

        const terminatedByDay: Record<string, number> = {};
        terminatedUsers.forEach((user) => {
            const dayKey = formatDateForGrouping(user.updatedAt);
            terminatedByDay[dayKey] = (terminatedByDay[dayKey] || 0) + 1;
        });

        // Generate all days in range
        const allDays = new Set<string>();
        const currentDate = new Date(startDate);
        while (currentDate <= now) {
            allDays.add(formatDateForGrouping(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        // Also add any days that have data
        Object.keys(registrationByDay).forEach((d) => allDays.add(d));
        Object.keys(activationByDay).forEach((d) => allDays.add(d));
        Object.keys(revenueByDay).forEach((d) => allDays.add(d));
        Object.keys(invoiceByDay).forEach((d) => allDays.add(d));
        Object.keys(overdueByDay).forEach((d) => allDays.add(d));
        Object.keys(blockedByDay).forEach((d) => allDays.add(d));
        Object.keys(terminatedByDay).forEach((d) => allDays.add(d));

        const sortedDays = Array.from(allDays).sort();

        // Prepare chart data
        const chartData = sortedDays.map((day) => ({
            day: formatDayLabel(day),
            registrasi: registrationByDay[day] || 0,
            aktivasi: activationByDay[day] || 0,
            revenue: Math.round((revenueByDay[day] || 0) / 1000) / 1000,
            overdue: overdueByDay[day] || 0,
            blocked: blockedByDay[day] || 0,
            terminated: terminatedByDay[day] || 0,
            invoices: invoiceByDay[day] || 0,
        }));

        // Calculate churn rate per day
        let cumulativeActive = 0;
        const churnRateData = sortedDays.map((day) => {
            const registrasi = registrationByDay[day] || 0;
            const aktivasi = activationByDay[day] || 0;
            const terminated = terminatedByDay[day] || 0;

            cumulativeActive += aktivasi;
            const terminatedBefore = sortedDays
                .slice(0, sortedDays.indexOf(day))
                .reduce((sum, d) => sum + (terminatedByDay[d] || 0), 0);

            const activeAtStart = cumulativeActive - terminatedBefore;
            const churnRate = activeAtStart > 0 ? (terminated / activeAtStart) * 100 : 0;

            return {
                day: formatDayLabel(day),
                churnRate: Math.round(churnRate * 100) / 100,
                terminated,
                activeAtStart,
            };
        });

        // Calculate cumulative for registration, activation, and revenue
        let cumulativeReg = 0;
        let cumulativeAct = 0;
        let cumulativeRev = 0;
        const cumulativeData = sortedDays.map((day) => {
            cumulativeReg += registrationByDay[day] || 0;
            cumulativeAct += activationByDay[day] || 0;
            cumulativeRev += (revenueByDay[day] || 0);

            return {
                day: formatDayLabel(day),
                registrasi: cumulativeReg,
                aktivasi: cumulativeAct,
                revenue: Math.round(cumulativeRev), // Include revenue
            };
        });

        // Invoice data per day
        const invoiceData = sortedDays.map((day) => ({
            day: formatDayLabel(day),
            invoices: invoiceByDay[day] || 0,
        }));

        return NextResponse.json({
            success: true,
            data: {
                cumulativeData,
                chartData,
                churnRateData,
                invoiceData,
            },
        });
    } catch (error: any) {
        console.error('[Dashboard Chart Data] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch chart data',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

