import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Get dashboard statistics for admin
 */
export async function GET() {
    try {
        // Get invoice statistics
        const [
            totalInvoices,
            paidInvoices,
            unpaidInvoices,
            overdueInvoices,
            allInvoices,
        ] = await Promise.all([
            prisma.invoice.count({ where: { deletedAt: null } }),
            prisma.invoice.count({ where: { status: 'PAID', deletedAt: null } }),
            prisma.invoice.count({ where: { status: 'UNPAID', deletedAt: null } }),
            prisma.invoice.count({ where: { status: { in: ['OVERDUE', 'EXPIRED'] }, deletedAt: null } }),
            prisma.invoice.findMany({
                where: { deletedAt: null },
                select: {
                    amount: true,
                    status: true,
                },
            }),
        ]);

        // Calculate revenue
        const totalRevenue = allInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const paidRevenue = allInvoices
            .filter(inv => inv.status === 'PAID')
            .reduce((sum, inv) => sum + Number(inv.amount), 0);
        const unpaidRevenue = allInvoices
            .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE' || inv.status === 'EXPIRED')
            .reduce((sum, inv) => sum + Number(inv.amount), 0);
        const overdueRevenue = allInvoices
            .filter(inv => inv.status === 'OVERDUE' || inv.status === 'EXPIRED')
            .reduce((sum, inv) => sum + Number(inv.amount), 0);

        // Get monthly revenue (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const monthlyInvoices = await prisma.invoice.findMany({
            where: {
                deletedAt: null,
                status: 'PAID',
                paidAt: {
                    gte: sixMonthsAgo,
                },
            },
            select: {
                amount: true,
                paidAt: true,
            },
        });

        // Group by month
        const monthlyRevenue: Record<string, number> = {};
        monthlyInvoices.forEach(inv => {
            if (inv.paidAt) {
                const monthKey = new Date(inv.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
                monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + Number(inv.amount);
            }
        });

        // Get today's revenue
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date(today);
        todayEnd.setHours(23, 59, 59, 999);

        const todayInvoices = await prisma.invoice.findMany({
            where: {
                deletedAt: null,
                status: 'PAID',
                paidAt: {
                    gte: today,
                    lte: todayEnd,
                },
            },
            select: {
                amount: true,
            },
        });

        const todayRevenue = todayInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

        // Get this month's revenue
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);

        const thisMonthInvoices = await prisma.invoice.findMany({
            where: {
                deletedAt: null,
                status: 'PAID',
                paidAt: {
                    gte: thisMonthStart,
                },
            },
            select: {
                amount: true,
            },
        });

        const thisMonthRevenue = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

        return NextResponse.json({
            success: true,
            data: {
                invoices: {
                    total: totalInvoices,
                    paid: paidInvoices,
                    unpaid: unpaidInvoices,
                    overdue: overdueInvoices,
                },
                revenue: {
                    total: totalRevenue,
                    paid: paidRevenue,
                    unpaid: unpaidRevenue,
                    overdue: overdueRevenue,
                    today: todayRevenue,
                    thisMonth: thisMonthRevenue,
                    monthly: monthlyRevenue,
                },
            },
        });
    } catch (error: any) {
        console.error('[Admin Dashboard Stats] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch dashboard statistics',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

