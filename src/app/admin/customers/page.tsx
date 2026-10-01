import { prisma } from '@/lib/prisma';
import { UserStatus } from '@prisma/client';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { CustomersList } from './customers-list';

export const dynamic = 'force-dynamic';

const DEFAULT_ITEMS_PER_PAGE = 20;
const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100];

interface PageProps {
    searchParams: Promise<{
        page?: string;
        status?: string;
        search?: string;
        sort?: string;
        order?: string;
        provinceId?: string;
        cityId?: string;
        groupBy?: string;
        perPage?: string;
        salesId?: string;
        packageId?: string;
        nextBillingDateFrom?: string;
        nextBillingDateTo?: string;
        revenueMin?: string;
        revenueMax?: string;
    }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
    const params = await searchParams;
    const currentPage = Number(params.page) || 1;
    const status = params.status || 'ALL';
    const search = params.search || '';
    const provinceId = params.provinceId || '';
    const cityId = params.cityId || '';
    const groupBy = params.groupBy || '';
    const salesId = params.salesId || '';
    const packageId = params.packageId || '';
    const nextBillingDateFrom = params.nextBillingDateFrom || '';
    const nextBillingDateTo = params.nextBillingDateTo || '';
    const revenueMin = params.revenueMin ? Number(params.revenueMin) : null;
    const revenueMax = params.revenueMax ? Number(params.revenueMax) : null;
    const itemsPerPage = Number(params.perPage) || DEFAULT_ITEMS_PER_PAGE;
    const skip = (currentPage - 1) * itemsPerPage;

    // Build where clause
    const where: any = {
        role: 'CUSTOMER',
    };

    // Filter by status
    if (status === 'DELETED') {
        where.deletedAt = { not: null };
    } else {
        where.deletedAt = null; // Exclude soft-deleted customers by default
        if (status !== 'ALL') {
            where.status = status;
        }
    }

    // Filter by province
    if (provinceId) {
        where.provinceId = provinceId;
    }

    // Filter by city
    if (cityId) {
        where.cityId = cityId;
    }

    // Filter by sales
    if (salesId) {
        where.salesPersonId = salesId;
    }

    // Filter by package (via subscription planName)
    if (packageId) {
        const packageData = await prisma.servicePackage.findUnique({
            where: { id: packageId },
            select: { name: true },
        });
        if (packageData) {
            where.subscription = {
                planName: packageData.name,
            };
        }
    }

    // Filter by next billing date range
    if (nextBillingDateFrom || nextBillingDateTo) {
        const subscriptionFilter: any = {};
        if (nextBillingDateFrom) {
            const fromDate = new Date(nextBillingDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            subscriptionFilter.gte = fromDate;
        }
        if (nextBillingDateTo) {
            const toDate = new Date(nextBillingDateTo);
            toDate.setHours(23, 59, 59, 999);
            subscriptionFilter.lte = toDate;
        }
        if (Object.keys(subscriptionFilter).length > 0) {
            where.subscription = {
                ...where.subscription,
                nextBillingDate: subscriptionFilter,
            };
        }
    }

    // Filter by search query
    if (search) {
        where.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
        ];
    }

    // Get total count
    const totalCustomers = await prisma.user.count({ where });

    // Build orderBy clause
    let orderBy: any = { createdAt: 'desc' };
    if (params.sort) {
        switch (params.sort) {
            case 'name':
                orderBy = { name: params.order || 'asc' };
                break;
            case 'package':
                orderBy = { subscription: { planName: params.order || 'asc' } };
                break;
            case 'nextBillingDate':
                orderBy = { subscription: { nextBillingDate: params.order || 'asc' } };
                break;
        }
    }

    // Get customers with pagination
    const customersRaw = await prisma.user.findMany({
        where,
        include: {
            subscription: true,
            salesPerson: true,
            province: true,
            city: true,
            invoices: {
                where: {
                    status: 'PAID',
                },
                select: {
                    amount: true,
                },
            },
        },
        orderBy,
        skip: groupBy ? undefined : skip,
        take: groupBy ? undefined : itemsPerPage,
    });

    // Calculate revenue per customer
    // Calculate revenue per customer
    const customers = customersRaw.map(customer => {
        const totalRevenue = customer.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);

        // Remove invoices from the object to prevent passing Decimal types to client
        const { invoices, ...customerWithoutInvoices } = customer;

        return {
            ...customerWithoutInvoices,
            subscription: customer.subscription ? {
                ...customer.subscription,
                price: Number(customer.subscription.price),
            } : null,
            sales: customer.salesPerson,
            totalRevenue,
        };
    });

    // Filter by revenue range (client-side filter after calculating revenue)
    let filteredCustomers = customers;
    if (revenueMin !== null || revenueMax !== null) {
        filteredCustomers = customers.filter(customer => {
            const revenue = customer.totalRevenue || 0;
            if (revenueMin !== null && revenue < revenueMin) return false;
            if (revenueMax !== null && revenue > revenueMax) return false;
            return true;
        });
    }

    // Group by region if requested
    let groupedCustomers: any[] = [];
    if (groupBy === 'province') {
        const grouped = filteredCustomers.reduce((acc, customer) => {
            const key = customer.province?.name || 'Tidak Diketahui';
            if (!acc[key]) {
                acc[key] = {
                    region: key,
                    customers: [],
                    totalRevenue: 0,
                    count: 0,
                };
            }
            acc[key].customers.push(customer);
            acc[key].totalRevenue += customer.totalRevenue;
            acc[key].count += 1;
            return acc;
        }, {} as Record<string, any>);
        groupedCustomers = Object.values(grouped);
    } else if (groupBy === 'city') {
        const grouped = filteredCustomers.reduce((acc, customer) => {
            const key = customer.city?.name || 'Tidak Diketahui';
            if (!acc[key]) {
                acc[key] = {
                    region: key,
                    customers: [],
                    totalRevenue: 0,
                    count: 0,
                };
            }
            acc[key].customers.push(customer);
            acc[key].totalRevenue += customer.totalRevenue;
            acc[key].count += 1;
            return acc;
        }, {} as Record<string, any>);
        groupedCustomers = Object.values(grouped);
    }

    // Get provinces and cities for filters
    const provinces = await prisma.province.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });

    const cities = provinceId ? await prisma.city.findMany({
        where: {
            isActive: true,
            provinceId,
        },
        orderBy: { name: 'asc' },
    }) : [];

    // Get sales and packages for filters
    const sales = await prisma.user.findMany({
        where: {
            role: 'SALES',
            status: 'ACTIVE'
        },
        orderBy: { name: 'asc' },
    });

    const packages = await prisma.servicePackage.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });

    // Calculate total revenue per region for filter display
    const revenueWhere: any = {
        role: 'CUSTOMER',
    };

    if (status === 'DELETED') {
        revenueWhere.deletedAt = { not: null };
    } else {
        revenueWhere.deletedAt = null;
        if (status !== 'ALL') {
            revenueWhere.status = status;
        }
    }

    const revenueByProvince = await prisma.user.groupBy({
        by: ['provinceId'],
        where: revenueWhere,
        _count: {
            id: true,
        },
    });

    const revenueData = await Promise.all(
        revenueByProvince.map(async (item) => {
            if (!item.provinceId) return null;
            const province = await prisma.province.findUnique({
                where: { id: item.provinceId },
            });
            const customersInProvince = await prisma.user.findMany({
                where: {
                    ...revenueWhere,
                    provinceId: item.provinceId,
                },
                include: {
                    invoices: {
                        where: { status: 'PAID' },
                        select: { amount: true },
                    },
                },
            });
            const totalRevenue = customersInProvince.reduce((sum, c) => {
                return sum + c.invoices.reduce((s, inv) => s + Number(inv.amount), 0);
            }, 0);
            return {
                provinceId: item.provinceId,
                provinceName: province?.name || 'Tidak Diketahui',
                count: item._count.id,
                totalRevenue,
            };
        })
    );

    // Recalculate totalCustomers after revenue filter
    // If revenue filter is active, we need to count all matching customers (not just paginated ones)
    let finalTotalCustomers = totalCustomers;
    if (revenueMin !== null || revenueMax !== null) {
        // Get all customers matching other filters (without pagination) to calculate revenue filter count
        const allCustomersForRevenueFilter = await prisma.user.findMany({
            where: {
                ...where,
                deletedAt: null,
            },
            include: {
                invoices: {
                    where: { status: 'PAID' },
                    select: { amount: true },
                },
            },
        });

        const revenueFilteredCount = allCustomersForRevenueFilter.filter(customer => {
            const totalRevenue = customer.invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
            if (revenueMin !== null && totalRevenue < revenueMin) return false;
            if (revenueMax !== null && totalRevenue > revenueMax) return false;
            return true;
        }).length;

        finalTotalCustomers = revenueFilteredCount;
    }

    const totalPages = groupBy ? 1 : Math.ceil(finalTotalCustomers / itemsPerPage);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;

    // Get status counts for all customers (for tabs)
    const statusCounts = await prisma.user.groupBy({
        by: ['status'],
        where: {
            role: 'CUSTOMER',
        },
        _count: {
            status: true,
        },
    });

    // Get count of deleted customers
    const deletedCount = await prisma.user.count({
        where: {
            role: 'CUSTOMER',
            deletedAt: { not: null }
        }
    });

    const statusCountMap = statusCounts.reduce((acc, item) => {
        acc[item.status] = item._count.status;
        return acc;
    }, {} as Record<string, number>);

    // Add deleted count
    statusCountMap['DELETED'] = deletedCount;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Daftar Pelanggan</h2>
                <Link
                    href="/admin/customers/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Tambah Pelanggan
                </Link>
            </div>

            {/* Customers List with Tabs, Search, and Sort */}
            <CustomersList
                customers={groupBy ? groupedCustomers : filteredCustomers}
                totalCustomers={finalTotalCustomers}
                currentPage={currentPage}
                totalPages={totalPages}
                statusCounts={statusCountMap}
                provinces={provinces}
                cities={cities}
                selectedProvinceId={provinceId}
                selectedCityId={cityId}
                groupBy={groupBy}
                itemsPerPage={itemsPerPage}
                itemsPerPageOptions={ITEMS_PER_PAGE_OPTIONS}
                revenueByProvince={revenueData.filter(Boolean)}
                isGrouped={!!groupBy}
                sales={sales}
                packages={packages}
                selectedSalesId={salesId}
                selectedPackageId={packageId}
                nextBillingDateFrom={nextBillingDateFrom}
                nextBillingDateTo={nextBillingDateTo}
                revenueMin={revenueMin}
                revenueMax={revenueMax}
            />

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border border-gray-200 sm:px-6 mt-4 rounded-lg shadow">
                    <div className="flex-1 flex justify-between sm:hidden">
                        {hasPrevPage && (
                            <Link
                                href={`/admin/customers?page=${currentPage - 1}${status !== 'ALL' ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}${provinceId ? `&provinceId=${provinceId}` : ''}${cityId ? `&cityId=${cityId}` : ''}${groupBy ? `&groupBy=${groupBy}` : ''}${itemsPerPage !== 20 ? `&perPage=${itemsPerPage}` : ''}`}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Sebelumnya
                            </Link>
                        )}
                        {hasNextPage && (
                            <Link
                                href={`/admin/customers?page=${currentPage + 1}${status !== 'ALL' ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}${provinceId ? `&provinceId=${provinceId}` : ''}${cityId ? `&cityId=${cityId}` : ''}${groupBy ? `&groupBy=${groupBy}` : ''}${itemsPerPage !== 20 ? `&perPage=${itemsPerPage}` : ''}`}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                Selanjutnya
                            </Link>
                        )}
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Menampilkan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> sampai{' '}
                                <span className="font-medium">
                                    {Math.min(currentPage * itemsPerPage, totalCustomers)}
                                </span>{' '}
                                dari <span className="font-medium">{totalCustomers}</span> pelanggan
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                {hasPrevPage ? (
                                    <Link
                                        href={`/admin/customers?page=${currentPage - 1}${status !== 'ALL' ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}${provinceId ? `&provinceId=${provinceId}` : ''}${cityId ? `&cityId=${cityId}` : ''}${groupBy ? `&groupBy=${groupBy}` : ''}${itemsPerPage !== 20 ? `&perPage=${itemsPerPage}` : ''}`}
                                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                    >
                                        <span className="sr-only">Sebelumnya</span>
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </Link>
                                ) : (
                                    <span className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-gray-100 text-sm font-medium text-gray-400 cursor-not-allowed">
                                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                )}

                                {/* Page numbers */}
                                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                                    if (
                                        page === 1 ||
                                        page === totalPages ||
                                        (page >= currentPage - 1 && page <= currentPage + 1)
                                    ) {
                                        return (
                                            <Link
                                                key={page}
                                                href={`/admin/customers?page=${page}${status !== 'ALL' ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}${provinceId ? `&provinceId=${provinceId}` : ''}${cityId ? `&cityId=${cityId}` : ''}${groupBy ? `&groupBy=${groupBy}` : ''}${itemsPerPage !== 20 ? `&perPage=${itemsPerPage}` : ''}`}
                                                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === currentPage
                                                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {page}
                                            </Link>
                                        );
                                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                                        return (
                                            <span
                                                key={page}
                                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700"
                                            >
                                                ...
                                            </span>
                                        );
                                    }
                                    return null;
                                })}

                                {hasNextPage ? (
                                    <Link
                                        href={`/admin/customers?page=${currentPage + 1}${status !== 'ALL' ? `&status=${status}` : ''}${search ? `&search=${search}` : ''}${provinceId ? `&provinceId=${provinceId}` : ''}${cityId ? `&cityId=${cityId}` : ''}${groupBy ? `&groupBy=${groupBy}` : ''}${itemsPerPage !== 20 ? `&perPage=${itemsPerPage}` : ''}`}
                                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                                    >
                                        <span className="sr-only">Selanjutnya</span>
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </Link>
                                ) : (
                                    <span className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-gray-100 text-sm font-medium text-gray-400 cursor-not-allowed">
                                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                )}
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
