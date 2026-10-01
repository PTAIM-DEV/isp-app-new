import { prisma } from '@/lib/prisma';
import { Users, UserCheck, AlertCircle, Ban, XCircle, AlertTriangle, DollarSign, FileText, TrendingUp, Calendar, ArrowUpRight, ArrowDownRight, CreditCard, Activity } from 'lucide-react';
import { DashboardCharts } from './dashboard-charts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export const dynamic = 'force-dynamic';

// Helper function to format date for grouping (per day)
function formatDateForGrouping(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to format day label
function formatDayLabel(dateStr: string): string {
    const [year, month, day] = dateStr.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${day} ${monthNames[parseInt(month) - 1]}`;
}

export default async function AdminDashboard() {
    // Fix: Count by status instead of role
    const leadsCount = await prisma.user.count({ where: { status: 'LEAD' } });
    const activeCount = await prisma.user.count({ where: { status: 'ACTIVE' } });
    const pendingCount = await prisma.user.count({ where: { status: 'PENDING_INSTALL' } });

    // Additional stats for overdue, blocked, and terminated
    const overdueCount = await prisma.invoice.count({
        where: { status: 'OVERDUE', deletedAt: null }
    });
    const blockedCount = await prisma.user.count({
        where: { status: 'BLOCKED' }
    });
    const terminatedCount = await prisma.user.count({
        where: { status: 'INACTIVE' }
    });

    // Invoice statistics
    const totalInvoices = await prisma.invoice.count({ where: { deletedAt: null } });
    const paidInvoicesCount = await prisma.invoice.count({ where: { status: 'PAID', deletedAt: null } });
    const unpaidInvoicesCount = await prisma.invoice.count({ where: { status: 'UNPAID', deletedAt: null } });

    // Revenue statistics
    const allInvoices = await prisma.invoice.findMany({
        where: { deletedAt: null },
        select: {
            amount: true,
            status: true,
            paidAt: true,
        },
    });

    const totalRevenue = allInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const paidRevenue = allInvoices
        .filter(inv => inv.status === 'PAID')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);
    const unpaidRevenue = allInvoices
        .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE' || inv.status === 'EXPIRED')
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

    // This month's sales (invoices created this month)
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    const thisMonthInvoices = await prisma.invoice.findMany({
        where: {
            deletedAt: null,
            createdAt: {
                gte: thisMonthStart,
            },
        },
        select: {
            amount: true,
            status: true,
        },
    });

    const thisMonthSales = thisMonthInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const thisMonthSalesCount = thisMonthInvoices.length;

    // This month's receivables (unpaid invoices with dueDate this month)
    const thisMonthEnd = new Date();
    thisMonthEnd.setMonth(thisMonthEnd.getMonth() + 1);
    thisMonthEnd.setDate(0);
    thisMonthEnd.setHours(23, 59, 59, 999);

    const thisMonthReceivables = await prisma.invoice.findMany({
        where: {
            deletedAt: null,
            status: { in: ['UNPAID', 'OVERDUE', 'EXPIRED'] },
            dueDate: {
                gte: thisMonthStart,
                lte: thisMonthEnd,
            },
        },
        select: {
            amount: true,
        },
    });

    const thisMonthReceivablesAmount = thisMonthReceivables.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const thisMonthReceivablesCount = thisMonthReceivables.length;

    // Today's revenue
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    const todayRevenue = allInvoices
        .filter(inv => inv.status === 'PAID' && inv.paidAt && inv.paidAt >= today && inv.paidAt <= todayEnd)
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

    // This month's revenue (using thisMonthStart that was already defined above)
    const thisMonthRevenue = allInvoices
        .filter(inv => inv.status === 'PAID' && inv.paidAt && inv.paidAt >= thisMonthStart)
        .reduce((sum, inv) => sum + Number(inv.amount), 0);

    // Format currency helper - using utils or inline if not in utils yet. 
    // Since utils formatCurrency might not exist or be different, let's keep a local one or update utils later.
    // The previous view_file of utils.ts only showed `formatDate` and `cn`. Let's stick to local helper for now to avoid errors.
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Get data for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Get data for customer growth by registration date (last 30 days)
    const allUsers = await prisma.user.findMany({
        where: {
            role: 'CUSTOMER',
            createdAt: {
                gte: thirtyDaysAgo,
            },
        },
        select: {
            createdAt: true,
        },
        orderBy: {
            createdAt: 'asc',
        },
    });

    // Get data for customer activation (last 30 days)
    const subscriptions = await prisma.subscription.findMany({
        where: {
            activatedDate: {
                not: null,
                gte: thirtyDaysAgo,
            },
        },
        select: {
            activatedDate: true,
        },
        orderBy: {
            activatedDate: 'asc',
        },
    });

    // Get revenue data (paid invoices - last 30 days)
    const paidInvoices = await prisma.invoice.findMany({
        where: {
            status: 'PAID',
            paidAt: {
                not: null,
                gte: thirtyDaysAgo,
            },
        },
        select: {
            amount: true,
            paidAt: true,
        },
    });

    // Get invoice creation data (last 30 days) - for invoice printed per day
    const allInvoicesCreated = await prisma.invoice.findMany({
        where: {
            deletedAt: null,
            createdAt: {
                gte: thirtyDaysAgo,
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

    // Get overdue invoices data (for tracking when they became overdue - last 30 days)
    const overdueInvoices = await prisma.invoice.findMany({
        where: {
            status: 'OVERDUE',
            updatedAt: {
                gte: thirtyDaysAgo,
            },
        },
        select: {
            updatedAt: true,
        },
    });

    // Get blocked users data (for tracking when they were blocked - last 30 days)
    const blockedUsers = await prisma.user.findMany({
        where: {
            status: 'BLOCKED',
            updatedAt: {
                gte: thirtyDaysAgo,
            },
        },
        select: {
            updatedAt: true,
        },
    });

    // Get terminated/churned users data (for tracking when they were terminated - last 30 days)
    const terminatedUsers = await prisma.user.findMany({
        where: {
            status: 'INACTIVE',
            updatedAt: {
                gte: thirtyDaysAgo,
            },
        },
        select: {
            updatedAt: true,
        },
    });

    // Group by day for registration
    const registrationByDay: Record<string, number> = {};
    allUsers.forEach((user) => {
        const dayKey = formatDateForGrouping(user.createdAt);
        registrationByDay[dayKey] = (registrationByDay[dayKey] || 0) + 1;
    });

    // Group by day for activation
    const activationByDay: Record<string, number> = {};
    subscriptions.forEach((sub) => {
        if (sub.activatedDate) {
            const dayKey = formatDateForGrouping(sub.activatedDate);
            activationByDay[dayKey] = (activationByDay[dayKey] || 0) + 1;
        }
    });

    // Group revenue by day
    const revenueByDay: Record<string, number> = {};
    paidInvoices.forEach((invoice) => {
        if (invoice.paidAt) {
            const dayKey = formatDateForGrouping(invoice.paidAt);
            const amount = Number(invoice.amount);
            revenueByDay[dayKey] = (revenueByDay[dayKey] || 0) + amount;
        }
    });

    // Group invoice creation by day (for invoice printed per day)
    const invoiceByDay: Record<string, number> = {};
    allInvoicesCreated.forEach((invoice) => {
        const dayKey = formatDateForGrouping(invoice.createdAt);
        invoiceByDay[dayKey] = (invoiceByDay[dayKey] || 0) + 1;
    });

    // Group overdue by day (when invoice was marked as overdue)
    const overdueByDay: Record<string, number> = {};
    overdueInvoices.forEach((invoice) => {
        const dayKey = formatDateForGrouping(invoice.updatedAt);
        overdueByDay[dayKey] = (overdueByDay[dayKey] || 0) + 1;
    });

    // Group blocked by day (when user was blocked)
    const blockedByDay: Record<string, number> = {};
    blockedUsers.forEach((user) => {
        const dayKey = formatDateForGrouping(user.updatedAt);
        blockedByDay[dayKey] = (blockedByDay[dayKey] || 0) + 1;
    });

    // Group terminated/churned by day (when user was terminated)
    const terminatedByDay: Record<string, number> = {};
    terminatedUsers.forEach((user) => {
        const dayKey = formatDateForGrouping(user.updatedAt);
        terminatedByDay[dayKey] = (terminatedByDay[dayKey] || 0) + 1;
    });

    // Generate all days for last 30 days
    const allDays = new Set<string>();
    for (let i = 0; i < 30; i++) {
        const date = new Date(thirtyDaysAgo);
        date.setDate(date.getDate() + i);
        allDays.add(formatDateForGrouping(date));
    }
    // Also add any days that have data
    Object.keys(registrationByDay).forEach((d) => allDays.add(d));
    Object.keys(activationByDay).forEach((d) => allDays.add(d));
    Object.keys(revenueByDay).forEach((d) => allDays.add(d));
    Object.keys(invoiceByDay).forEach((d) => allDays.add(d));
    Object.keys(overdueByDay).forEach((d) => allDays.add(d));
    Object.keys(blockedByDay).forEach((d) => allDays.add(d));
    Object.keys(terminatedByDay).forEach((d) => allDays.add(d));

    // Sort days chronologically
    const sortedDays = Array.from(allDays).sort();

    // Prepare chart data per day
    const chartData = sortedDays.map((day) => ({
        day: formatDayLabel(day),
        registrasi: registrationByDay[day] || 0,
        aktivasi: activationByDay[day] || 0,
        revenue: Math.round((revenueByDay[day] || 0) / 1000) / 1000, // Convert to millions (ribuan rupiah)
        overdue: overdueByDay[day] || 0,
        blocked: blockedByDay[day] || 0,
        terminated: terminatedByDay[day] || 0,
        invoices: invoiceByDay[day] || 0, // Invoice created per day
    }));

    // Calculate churn rate per day
    // Churn rate = (terminated users in day) / (active users at start of day) * 100
    let cumulativeActive = 0;
    const churnRateData = sortedDays.map((day) => {
        const registrasi = registrationByDay[day] || 0;
        const aktivasi = activationByDay[day] || 0;
        const terminated = terminatedByDay[day] || 0;

        // Active users at start of day = cumulative active - cumulative terminated before this day
        cumulativeActive += aktivasi;
        const terminatedBefore = sortedDays
            .slice(0, sortedDays.indexOf(day))
            .reduce((sum, d) => sum + (terminatedByDay[d] || 0), 0);

        const activeAtStart = cumulativeActive - terminatedBefore;
        const churnRate = activeAtStart > 0 ? (terminated / activeAtStart) * 100 : 0;

        return {
            day: formatDayLabel(day),
            churnRate: Math.round(churnRate * 100) / 100, // Round to 2 decimal places
            terminated,
            activeAtStart,
        };
    });

    // Calculate cumulative for registration, activation, and revenue per day
    let cumulativeReg = 0;
    let cumulativeAct = 0;
    let cumulativeRev = 0; // Cumulative Revenue
    const cumulativeData = sortedDays.map((day) => {
        cumulativeReg += registrationByDay[day] || 0;
        cumulativeAct += activationByDay[day] || 0;
        cumulativeRev += (revenueByDay[day] || 0); // Keep raw amount for now, or divide by 1000 if consistent with other charts. Let's keep raw format for flexibility or consistency.

        return {
            day: formatDayLabel(day),
            registrasi: cumulativeReg,
            aktivasi: cumulativeAct,
            revenue: Math.round(cumulativeRev), // Total accumulated revenue
        };
    });

    // Invoice data per day
    const invoiceData = sortedDays.map((day) => ({
        day: formatDayLabel(day),
        invoices: invoiceByDay[day] || 0,
    }));

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                <div className="flex items-center space-x-2">
                    <div className="text-sm text-muted-foreground">
                        {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>

            {/* Top Row - Business Health High Level */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Pendapatan
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground">
                            Lifetime revenue
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Pelanggan Aktif
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeCount + blockedCount}</div>
                        <p className="text-xs text-muted-foreground">
                            {activeCount} Active, {blockedCount} Blocked
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            ARPU (All Time)
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">
                            {formatCurrency((activeCount + blockedCount) > 0 ? totalRevenue / (activeCount + blockedCount) : 0)}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Rata-rata pendapatan/user
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Menunggu Instalasi
                        </CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{pendingCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Perlu dijadwalkan
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Overdue Invoices
                        </CardTitle>
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-destructive">{overdueCount}</div>
                        <p className="text-xs text-muted-foreground">
                            Perlu penagihan segera
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Main Charts Area */}
                <div className="col-span-4">
                    <DashboardCharts
                        initialCumulativeData={cumulativeData}
                        initialChartData={chartData}
                        initialChurnRateData={churnRateData}
                        initialInvoiceData={invoiceData}
                    />
                </div>

                {/* Right Column - Breakdown & Actionables */}
                <div className="col-span-3 space-y-4">
                    {/* Customer Status Breakdown */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Status Pelanggan</CardTitle>
                            <CardDescription>
                                Overview status basis pengguna saat ini
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                                        <Users className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">Calon Pelanggan</p>
                                        <p className="text-xs text-muted-foreground">Leads</p>
                                    </div>
                                </div>
                                <div className="font-bold">{leadsCount}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                                        <Ban className="h-4 w-4 text-red-600 dark:text-red-300" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">Terblokir</p>
                                        <p className="text-xs text-muted-foreground">Blocked (Soft)</p>
                                    </div>
                                </div>
                                <div className="font-bold">{blockedCount}</div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
                                        <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">Berhenti</p>
                                        <p className="text-xs text-muted-foreground">Terminated</p>
                                    </div>
                                </div>
                                <div className="font-bold">{terminatedCount}</div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Financial Summary */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Keuangan Bulan Ini</CardTitle>
                            <CardDescription>
                                Estimasi pendapatan periode berjalan
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">Pendapatan Masuk (Paid)</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                                        {formatCurrency(thisMonthRevenue)}
                                    </span>
                                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500"
                                        style={{ width: `${(thisMonthRevenue / (thisMonthRevenue + thisMonthReceivablesAmount || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-xs text-muted-foreground">Piutang (Unpaid)</div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                                        {formatCurrency(thisMonthReceivablesAmount)}
                                    </span>
                                    <ArrowDownRight className="h-4 w-4 text-orange-600" />
                                </div>
                                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-orange-500"
                                        style={{ width: `${(thisMonthReceivablesAmount / (thisMonthRevenue + thisMonthReceivablesAmount || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
