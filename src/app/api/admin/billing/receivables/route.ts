import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type CollectionStatus = 'NOT_COLLECTED' | 'COLLECTING' | 'PENDING_CONFIRMATION' | 'DISPUTE' | 'WRITE_OFF';

interface ReceivablesFilters {
    status?: string[]; // UNPAID, OVERDUE, EXPIRED
    category?: string;
    salesId?: string;
    packageId?: string;
    provinceId?: string;
    cityId?: string;
    districtId?: string;
    villageId?: string;
    collectionStatus?: CollectionStatus;
    agingBucket?: string; // '0-7', '8-15', '16-30', '31-60', '61-90', '>90'
    startDate?: string; // dueDate start
    endDate?: string; // dueDate end
    minAmount?: string;
    maxAmount?: string;
    userStatus?: string; // ACTIVE, BLOCKED, etc.
    search?: string; // invoice number, customer name, phone
}

function calculateAging(dueDate: Date, status: string): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

    // Always calculate from dueDate
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
}

function getAgingBucket(aging: number): string {
    if (aging <= 7) return '0-7';
    if (aging <= 15) return '8-15';
    if (aging <= 30) return '16-30';
    if (aging <= 60) return '31-60';
    if (aging <= 90) return '61-90';
    return '>90';
}

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;

        const filters: ReceivablesFilters = {
            status: searchParams.get('status')?.split(',').filter(Boolean),
            category: searchParams.get('category') || undefined,
            salesId: searchParams.get('salesId') || undefined,
            packageId: searchParams.get('packageId') || undefined,
            provinceId: searchParams.get('provinceId') || undefined,
            cityId: searchParams.get('cityId') || undefined,
            districtId: searchParams.get('districtId') || undefined,
            villageId: searchParams.get('villageId') || undefined,
            collectionStatus: searchParams.get('collectionStatus') as CollectionStatus | undefined,
            agingBucket: searchParams.get('agingBucket') || undefined,
            startDate: searchParams.get('startDate') || undefined,
            endDate: searchParams.get('endDate') || undefined,
            minAmount: searchParams.get('minAmount') || undefined,
            maxAmount: searchParams.get('maxAmount') || undefined,
            userStatus: searchParams.get('userStatus') || undefined,
            search: searchParams.get('search') || undefined,
        };

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build where clause
        const where: any = {
            status: { in: ['UNPAID', 'OVERDUE', 'EXPIRED'] },
            deletedAt: null,
        };

        // Exclude write-off: collectionStatus is null OR collectionStatus is not WRITE_OFF
        // But only if collectionStatus filter is not explicitly set
        if (!filters.collectionStatus) {
            // Use OR condition to include null values
            where.OR = [
                { collectionStatus: null },
                { collectionStatus: { not: 'WRITE_OFF' } },
            ];
        }

        // Status filter
        if (filters.status && filters.status.length > 0) {
            where.status = { in: filters.status };
        }

        // Category filter
        if (filters.category) {
            where.category = filters.category;
        }

        // Collection status filter
        if (filters.collectionStatus) {
            where.collectionStatus = filters.collectionStatus;
        }

        // Date range filter (dueDate)
        if (filters.startDate || filters.endDate) {
            where.dueDate = {};
            if (filters.startDate) {
                const start = new Date(filters.startDate);
                start.setHours(0, 0, 0, 0);
                where.dueDate.gte = start;
            }
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setHours(23, 59, 59, 999);
                where.dueDate.lte = end;
            }
        }

        // Amount range filter
        if (filters.minAmount || filters.maxAmount) {
            where.amount = {};
            if (filters.minAmount) {
                where.amount.gte = parseFloat(filters.minAmount);
            }
            if (filters.maxAmount) {
                where.amount.lte = parseFloat(filters.maxAmount);
            }
        }

        // User filters
        const userWhere: any = {};
        if (filters.salesId) {
            userWhere.salesPersonId = filters.salesId;
        }
        if (filters.provinceId) {
            userWhere.provinceId = filters.provinceId;
        }
        if (filters.cityId) {
            userWhere.cityId = filters.cityId;
        }
        if (filters.districtId) {
            userWhere.districtId = filters.districtId;
        }
        if (filters.villageId) {
            userWhere.villageId = filters.villageId;
        }
        if (filters.userStatus) {
            userWhere.status = filters.userStatus;
        }

        // Package filter
        if (filters.packageId) {
            // Get package name first
            const packageData = await prisma.servicePackage.findUnique({
                where: { id: filters.packageId },
                select: { name: true },
            });

            if (packageData) {
                userWhere.subscription = {
                    planName: packageData.name,
                };
            }
        }

        // Search filter (invoice number, customer name, phone)
        if (filters.search) {
            userWhere.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { phone: { contains: filters.search } },
            ];
            // Add search condition to AND
            if (!where.AND) {
                where.AND = [];
            }
            where.AND.push({
                OR: [
                    { invoiceNumber: { contains: filters.search, mode: 'insensitive' } },
                    { user: userWhere },
                ],
            });
        }

        // Add userWhere if there are user filters (but not if search is used, as it's already in AND)
        if (!filters.search && Object.keys(userWhere).length > 0) {
            where.user = userWhere;
        }

        // Fetch invoices
        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                user: {
                    include: {
                        salesPerson: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                            },
                        },
                        subscription: {
                            include: {
                                // Package info if needed
                            },
                        },
                        province: {
                            select: { name: true },
                        },
                        city: {
                            select: { name: true },
                        },
                        district: {
                            select: { name: true },
                        },
                        village: {
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });

        // Calculate aging and filter by aging bucket if needed
        let processedInvoices = invoices.map((invoice) => {
            const aging = calculateAging(invoice.dueDate, invoice.status);
            const bucket = getAgingBucket(aging);

            return {
                ...invoice,
                aging,
                agingBucket: bucket,
            };
        });

        // Filter by aging bucket
        if (filters.agingBucket) {
            processedInvoices = processedInvoices.filter(
                (inv) => inv.agingBucket === filters.agingBucket
            );
        }

        // Calculate summary statistics
        const totalReceivable = processedInvoices.reduce(
            (sum, inv) => sum + Number(inv.amount),
            0
        );

        const currentReceivable = processedInvoices
            .filter((inv) => new Date(inv.dueDate) >= today)
            .reduce((sum, inv) => sum + Number(inv.amount), 0);

        const overdueReceivable = processedInvoices
            .filter((inv) => new Date(inv.dueDate) < today)
            .reduce((sum, inv) => sum + Number(inv.amount), 0);

        const customerCount = new Set(processedInvoices.map((inv) => inv.userId)).size;
        const averageReceivable = customerCount > 0 ? totalReceivable / customerCount : 0;

        // Calculate aging bucket summary
        const agingBuckets = {
            '0-7': { count: 0, amount: 0 },
            '8-15': { count: 0, amount: 0 },
            '16-30': { count: 0, amount: 0 },
            '31-60': { count: 0, amount: 0 },
            '61-90': { count: 0, amount: 0 },
            '>90': { count: 0, amount: 0 },
        };

        processedInvoices.forEach((inv) => {
            const bucket = inv.agingBucket;
            if (agingBuckets[bucket as keyof typeof agingBuckets]) {
                agingBuckets[bucket as keyof typeof agingBuckets].count++;
                agingBuckets[bucket as keyof typeof agingBuckets].amount += Number(inv.amount);
            }
        });

        // Category breakdown
        const categoryBreakdown: Record<string, { count: number; amount: number }> = {};
        processedInvoices.forEach((inv) => {
            const cat = inv.category;
            if (!categoryBreakdown[cat]) {
                categoryBreakdown[cat] = { count: 0, amount: 0 };
            }
            categoryBreakdown[cat].count++;
            categoryBreakdown[cat].amount += Number(inv.amount);
        });

        // Collection status breakdown
        const collectionStatusBreakdown: Record<string, { count: number; amount: number }> = {};
        processedInvoices.forEach((inv) => {
            const status = inv.collectionStatus || 'NOT_COLLECTED';
            if (!collectionStatusBreakdown[status]) {
                collectionStatusBreakdown[status] = { count: 0, amount: 0 };
            }
            collectionStatusBreakdown[status].count++;
            collectionStatusBreakdown[status].amount += Number(inv.amount);
        });

        return NextResponse.json({
            success: true,
            data: {
                invoices: processedInvoices,
                summary: {
                    totalReceivable,
                    currentReceivable,
                    overdueReceivable,
                    customerCount,
                    averageReceivable,
                    invoiceCount: processedInvoices.length,
                },
                agingBuckets,
                categoryBreakdown,
                collectionStatusBreakdown,
            },
        });
    } catch (error: any) {
        console.error('Error fetching receivables:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

