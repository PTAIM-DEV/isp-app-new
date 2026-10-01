import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PeriodType = '1day' | 'yesterday' | '7days' | '1month' | '3months' | '6months' | 'ytd' | 'legacy';

interface RevenueReportFilters {
    period?: PeriodType;
    salesId?: string;
    packageId?: string;
    provinceId?: string;
    cityId?: string;
    districtId?: string;
    villageId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
}

function getPeriodDates(period: PeriodType): { start: Date; end: Date; previousStart: Date; previousEnd: Date } {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const end = new Date(now);

    let start: Date;
    let previousStart: Date;
    let previousEnd: Date;

    switch (period) {
        case '1day': {
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
            previousStart = new Date(start);
            previousStart.setDate(previousStart.getDate() - 1);
            previousEnd = new Date(start);
            previousEnd.setHours(23, 59, 59, 999);
            break;
        }
        case 'yesterday': {
            start = new Date(now);
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            const yesterdayEnd = new Date(start);
            yesterdayEnd.setHours(23, 59, 59, 999);
            previousStart = new Date(start);
            previousStart.setDate(previousStart.getDate() - 1);
            previousStart.setHours(0, 0, 0, 0);
            previousEnd = new Date(start);
            previousEnd.setDate(previousEnd.getDate() - 1);
            previousEnd.setHours(23, 59, 59, 999);
            return { start, end: yesterdayEnd, previousStart, previousEnd };
        }
        case '7days': {
            start = new Date(now);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            previousStart = new Date(start);
            previousStart.setDate(previousStart.getDate() - 7);
            previousEnd = new Date(start);
            previousEnd.setDate(previousEnd.getDate() - 1);
            previousEnd.setHours(23, 59, 59, 999);
            break;
        }
        case '1month': {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            previousStart.setHours(0, 0, 0, 0);
            previousEnd = new Date(now.getFullYear(), now.getMonth(), 0);
            previousEnd.setHours(23, 59, 59, 999);
            break;
        }
        case '3months': {
            start = new Date(now);
            start.setMonth(start.getMonth() - 2);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            previousStart = new Date(start);
            previousStart.setMonth(previousStart.getMonth() - 3);
            previousEnd = new Date(start);
            previousEnd.setDate(previousEnd.getDate() - 1);
            previousEnd.setHours(23, 59, 59, 999);
            break;
        }
        case '6months': {
            start = new Date(now);
            start.setMonth(start.getMonth() - 5);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            previousStart = new Date(start);
            previousStart.setMonth(previousStart.getMonth() - 6);
            previousEnd = new Date(start);
            previousEnd.setDate(previousEnd.getDate() - 1);
            previousEnd.setHours(23, 59, 59, 999);
            break;
        }
        case 'ytd': {
            start = new Date(now.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);
            previousStart = new Date(now.getFullYear() - 1, 0, 1);
            previousStart.setHours(0, 0, 0, 0);
            previousEnd = new Date(now.getFullYear() - 1, 11, 31);
            previousEnd.setHours(23, 59, 59, 999);
            break;
        }
        case 'legacy':
        default: {
            // Default to today
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
            previousStart = new Date(start);
            previousStart.setDate(previousStart.getDate() - 1);
            previousEnd = new Date(start);
            previousEnd.setHours(23, 59, 59, 999);
            break;
        }
    }

    return { start, end, previousStart, previousEnd };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = (searchParams.get('period') || '1day') as PeriodType;
        const salesId = searchParams.get('salesId') || undefined;
        const packageId = searchParams.get('packageId') || undefined;
        const provinceId = searchParams.get('provinceId') || undefined;
        const cityId = searchParams.get('cityId') || undefined;
        const districtId = searchParams.get('districtId') || undefined;
        const villageId = searchParams.get('villageId') || undefined;
        const category = searchParams.get('category') || undefined;
        const customStartDate = searchParams.get('startDate') || undefined;
        const customEndDate = searchParams.get('endDate') || undefined;

        // Handle legacy payments (from old system without invoices)
        if (period === 'legacy') {
            // Get legacy payment transactions
            const legacyWhere: any = {
                invoiceId: null,
                status: 'PAID',
                paidAt: { not: null },
            };

            // Location filters and sales filter
            const userWhere: any = {};
            if (provinceId) userWhere.provinceId = provinceId;
            if (cityId) userWhere.cityId = cityId;
            if (districtId) userWhere.districtId = districtId;
            if (villageId) userWhere.villageId = villageId;
            if (salesId) userWhere.salesPersonId = salesId;

            if (Object.keys(userWhere).length > 0) {
                legacyWhere.user = userWhere;
            }

            const legacyTransactions = await prisma.paymentTransaction.findMany({
                where: legacyWhere,
                include: {
                    user: {
                        include: {
                            salesPerson: true,
                            province: true,
                            city: true,
                            district: true,
                            village: true,
                        },
                    },
                },
                orderBy: {
                    paidAt: 'desc',
                },
            });

            // Calculate totals
            const totalRevenue = legacyTransactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
            const transactionCount = legacyTransactions.length;
            const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;

            // Breakdown by payment method
            const categoryBreakdown: Record<string, { revenue: number; count: number }> = {};
            legacyTransactions.forEach(tx => {
                const method = tx.paymentMethod || 'UNKNOWN';
                if (!categoryBreakdown[method]) {
                    categoryBreakdown[method] = { revenue: 0, count: 0 };
                }
                categoryBreakdown[method].revenue += Number(tx.amount);
                categoryBreakdown[method].count += 1;
            });

            // Daily breakdown
            const dailyBreakdown: Record<string, number> = {};
            legacyTransactions.forEach(tx => {
                if (tx.paidAt) {
                    const dateKey = tx.paidAt.toISOString().split('T')[0];
                    dailyBreakdown[dateKey] = (dailyBreakdown[dateKey] || 0) + Number(tx.amount);
                }
            });

            const sortedDailyBreakdown = Object.entries(dailyBreakdown)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, revenue]) => ({ date, revenue }));

            // Get earliest and latest dates
            const dates = legacyTransactions
                .filter(tx => tx.paidAt)
                .map(tx => new Date(tx.paidAt!))
                .sort((a, b) => a.getTime() - b.getTime());

            const earliestDate = dates.length > 0 ? dates[0] : new Date();
            const latestDate = dates.length > 0 ? dates[dates.length - 1] : new Date();

            return NextResponse.json({
                success: true,
                data: {
                    period: 'legacy',
                    dateRange: {
                        start: earliestDate.toISOString(),
                        end: latestDate.toISOString(),
                    },
                    summary: {
                        totalRevenue,
                        transactionCount,
                        averageTransaction,
                        revenueChange: 0, // No comparison for legacy
                        transactionChange: 0,
                        averageChange: 0,
                    },
                    previousPeriod: {
                        totalRevenue: 0,
                        transactionCount: 0,
                        averageTransaction: 0,
                    },
                    categoryBreakdown,
                    dailyBreakdown: sortedDailyBreakdown,
                    transactions: legacyTransactions.map(tx => ({
                        id: tx.id,
                        invoiceNumber: null,
                        amount: Number(tx.amount),
                        paidAt: tx.paidAt?.toISOString(),
                        category: tx.paymentMethod || 'UNKNOWN',
                        type: tx.paymentChannel || '',
                        description: null,
                        user: {
                            id: tx.user?.id || '',
                            name: tx.user?.name || '-',
                            phone: tx.user?.phone || '-',
                            sales: tx.user?.salesPerson ? {
                                id: tx.user.salesPerson.id,
                                name: tx.user.salesPerson.name,
                            } : null,
                            location: {
                                province: tx.user?.province?.name,
                                city: tx.user?.city?.name,
                                district: tx.user?.district?.name,
                                village: tx.user?.village?.name,
                            },
                            package: null,
                        },
                    })),
                },
            });
        }

        // Build where clause for filters
        const whereClause: any = {
            deletedAt: null,
            status: 'PAID',
            paidAt: { not: null },
        };

        // Date range
        let startDate: Date;
        let endDate: Date;
        let previousStartDate: Date;
        let previousEndDate: Date;

        if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);
            // For custom dates, calculate previous period
            const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            previousEndDate = new Date(startDate);
            previousEndDate.setDate(previousEndDate.getDate() - 1);
            previousEndDate.setHours(23, 59, 59, 999);
            previousStartDate = new Date(previousEndDate);
            previousStartDate.setDate(previousStartDate.getDate() - diffDays);
            previousStartDate.setHours(0, 0, 0, 0);
        } else {
            const dates = getPeriodDates(period);
            startDate = dates.start;
            endDate = dates.end;
            previousStartDate = dates.previousStart;
            previousEndDate = dates.previousEnd;
        }

        whereClause.paidAt = {
            gte: startDate,
            lte: endDate,
        };

        // Category filter
        if (category) {
            whereClause.category = category;
        }

        // Location filters and package filter
        const userWhere: any = {};
        if (provinceId) userWhere.provinceId = provinceId;
        if (cityId) userWhere.cityId = cityId;
        if (districtId) userWhere.districtId = districtId;
        if (villageId) userWhere.villageId = villageId;
        if (salesId) userWhere.salesPersonId = salesId;

        // Package filter (through subscription)
        if (packageId) {
            // First get the package name
            const packageData = await prisma.servicePackage.findUnique({
                where: { id: packageId },
                select: { name: true },
            });

            if (packageData) {
                userWhere.subscription = {
                    planName: packageData.name,
                };
            }
        }

        if (Object.keys(userWhere).length > 0) {
            whereClause.user = userWhere;
        }

        // Get current period invoices
        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            include: {
                user: {
                    include: {
                        salesPerson: true,
                        province: true,
                        city: true,
                        district: true,
                        village: true,
                        subscription: true,
                    },
                },
            },
            orderBy: {
                paidAt: 'desc',
            },
        });

        // Get previous period invoices for comparison
        const previousWhereClause = {
            ...whereClause,
            paidAt: {
                gte: previousStartDate,
                lte: previousEndDate,
            },
        };

        const previousInvoices = await prisma.invoice.findMany({
            where: previousWhereClause,
            select: {
                amount: true,
                paidAt: true,
                category: true,
            },
        });

        // Calculate totals
        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const previousTotalRevenue = previousInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const revenueChange = previousTotalRevenue > 0
            ? ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
            : 0;

        const transactionCount = invoices.length;
        const previousTransactionCount = previousInvoices.length;
        const transactionChange = previousTransactionCount > 0
            ? ((transactionCount - previousTransactionCount) / previousTransactionCount) * 100
            : 0;

        const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;
        const previousAverageTransaction = previousTransactionCount > 0 ? previousTotalRevenue / previousTransactionCount : 0;
        const averageChange = previousAverageTransaction > 0
            ? ((averageTransaction - previousAverageTransaction) / previousAverageTransaction) * 100
            : 0;

        // Get overdue invoices info (for card information)
        const overdueWhereClause: any = {
            deletedAt: null,
            status: { in: ['OVERDUE', 'UNPAID'] },
            dueDate: { lte: endDate },
            OR: [
                { collectionStatus: null },
                { collectionStatus: { not: 'WRITE_OFF' } },
            ],
        };

        // Apply same filters as paid invoices
        if (category) {
            overdueWhereClause.category = category;
        }
        if (Object.keys(userWhere).length > 0) {
            overdueWhereClause.user = userWhere;
        }

        const overdueInvoices = await prisma.invoice.findMany({
            where: overdueWhereClause,
            select: {
                amount: true,
                dueDate: true,
            },
        });

        const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const overdueCount = overdueInvoices.length;

        // Breakdown by category
        const categoryBreakdown: Record<string, { revenue: number; count: number }> = {};
        invoices.forEach(inv => {
            const cat = inv.category;
            if (!categoryBreakdown[cat]) {
                categoryBreakdown[cat] = { revenue: 0, count: 0 };
            }
            categoryBreakdown[cat].revenue += Number(inv.amount);
            categoryBreakdown[cat].count += 1;
        });

        // Daily breakdown for chart
        const dailyBreakdown: Record<string, number> = {};
        invoices.forEach(inv => {
            if (inv.paidAt) {
                const dateKey = inv.paidAt.toISOString().split('T')[0];
                dailyBreakdown[dateKey] = (dailyBreakdown[dateKey] || 0) + Number(inv.amount);
            }
        });

        // Sort daily breakdown chronologically
        const sortedDailyBreakdown = Object.entries(dailyBreakdown)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, revenue]) => ({ date, revenue }));

        return NextResponse.json({
            success: true,
            data: {
                period,
                dateRange: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                },
                summary: {
                    totalRevenue,
                    transactionCount,
                    averageTransaction,
                    revenueChange,
                    transactionChange,
                    averageChange,
                    overdueAmount,
                    overdueCount,
                },
                previousPeriod: {
                    totalRevenue: previousTotalRevenue,
                    transactionCount: previousTransactionCount,
                    averageTransaction: previousAverageTransaction,
                },
                categoryBreakdown,
                dailyBreakdown: sortedDailyBreakdown,
                transactions: invoices.map(inv => ({
                    id: inv.id,
                    invoiceNumber: inv.invoiceNumber,
                    amount: Number(inv.amount),
                    paidAt: inv.paidAt?.toISOString(),
                    category: inv.category,
                    type: inv.type,
                    description: inv.description,
                    user: {
                        id: inv.user.id,
                        name: inv.user.name,
                        phone: inv.user.phone,
                        sales: inv.user.salesPerson ? {
                            id: inv.user.salesPerson.id,
                            name: inv.user.salesPerson.name,
                        } : null,
                        location: {
                            province: inv.user.province?.name,
                            city: inv.user.city?.name,
                            district: inv.user.district?.name,
                            village: inv.user.village?.name,
                        },
                        package: inv.user.subscription?.planName,
                    },
                })),
            },
        });
    } catch (error: any) {
        console.error('[Revenue Report] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch revenue report',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

