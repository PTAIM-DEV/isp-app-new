'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExportButton } from './export-button';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Users, UserCheck, Clock, CheckCircle, AlertCircle, Ban, XCircle, MessageCircleQuestion } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { sendSalesStatusInquiry } from './actions';

interface Customer {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    status: string;
    subscription: {
        planName: string | null;
        price: any;
        nextBillingDate: Date | null;
    } | null;
    sales?: {
        name: string;
        phone?: string;
    } | null;
    lastSalesInquirySentAt?: Date | string | null;
    province?: {
        name: string;
    } | null;
    city?: {
        name: string;
    } | null;
    totalRevenue?: number;
    customers?: Customer[];
    region?: string;
    count?: number;
}

interface CustomersListProps {
    customers: Customer[];
    totalCustomers: number;
    currentPage: number;
    totalPages: number;
    statusCounts: Record<string, number>;
    provinces?: any[];
    cities?: any[];
    selectedProvinceId?: string;
    selectedCityId?: string;
    groupBy?: string;
    itemsPerPage?: number;
    itemsPerPageOptions?: number[];
    revenueByProvince?: any[];
    isGrouped?: boolean;
    sales?: any[];
    packages?: any[];
    selectedSalesId?: string;
    selectedPackageId?: string;
    nextBillingDateFrom?: string;
    nextBillingDateTo?: string;
    revenueMin?: number | null;
    revenueMax?: number | null;
}

type SortField = 'name' | 'package' | 'nextBillingDate' | null;
type SortOrder = 'asc' | 'desc';

const STATUS_TABS = [
    { value: 'ALL', label: 'Semua', icon: Users, color: 'indigo' },
    { value: 'LEAD', label: 'Calon Pelanggan', icon: Users, color: 'gray' },
    { value: 'LEAD_PAYMENT_PENDING', label: 'Menunggu Bayar Instalasi', icon: Clock, color: 'yellow' },
    { value: 'PENDING_INSTALL', label: 'Menunggu Instalasi', icon: Clock, color: 'orange' },
    { value: 'INSTALLED', label: 'Sudah Terpasang', icon: CheckCircle, color: 'blue' },
    { value: 'INSTALLED_PAYMENT_PENDING', label: 'Menunggu Bayar Bulan Pertama', icon: Clock, color: 'amber' },
    { value: 'ACTIVE', label: 'Aktif', icon: UserCheck, color: 'green' },
    { value: 'BLOCKED', label: 'Diblokir', icon: Ban, color: 'red' },
    { value: 'INACTIVE', label: 'Nonaktif', icon: XCircle, color: 'gray' },
    { value: 'DELETED', label: 'Sampah', icon: AlertCircle, color: 'red' },
];

export function CustomersList({
    customers,
    totalCustomers,
    currentPage,
    totalPages,
    statusCounts,
    provinces = [],
    cities = [],
    selectedProvinceId = '',
    selectedCityId = '',
    groupBy = '',
    itemsPerPage = 20,
    itemsPerPageOptions = [10, 20, 50, 100],
    revenueByProvince = [],
    isGrouped = false,
    sales = [],
    packages = [],
    selectedSalesId = '',
    selectedPackageId = '',
    nextBillingDateFrom = '',
    nextBillingDateTo = '',
    revenueMin = null,
    revenueMax = null,
}: CustomersListProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
    const [selectedProvince, setSelectedProvince] = useState(selectedProvinceId);
    const [selectedCity, setSelectedCity] = useState(selectedCityId);
    const [selectedSales, setSelectedSales] = useState(selectedSalesId);
    const [selectedPackage, setSelectedPackage] = useState(selectedPackageId);
    const [nextBillingFrom, setNextBillingFrom] = useState(nextBillingDateFrom);
    const [nextBillingTo, setNextBillingTo] = useState(nextBillingDateTo);
    const [revenueMinValue, setRevenueMinValue] = useState(revenueMin?.toString() || '');
    const [revenueMaxValue, setRevenueMaxValue] = useState(revenueMax?.toString() || '');
    const [groupByValue, setGroupByValue] = useState(groupBy);
    const [showFilters, setShowFilters] = useState(false);
    const [inquiryLoading, setInquiryLoading] = useState<string | null>(null);
    const activeTab = searchParams.get('status') || 'ALL';
    const sortField = (searchParams.get('sort') as SortField) || null;
    const sortOrder = (searchParams.get('order') as SortOrder) || 'asc';

    // Fetch cities when province changes
    useEffect(() => {
        if (selectedProvince) {
            fetch(`/api/locations/cities?provinceId=${selectedProvince}`)
                .then(res => res.json())
                .then(data => {
                    // Cities will be passed from server
                });
        }
    }, [selectedProvince]);

    const handleTabChange = (tab: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (tab === 'ALL') {
            params.delete('status');
        } else {
            params.set('status', tab);
        }
        params.delete('page');
        router.push(`/admin/customers?${params.toString()}`);
    };

    const handleProvinceChange = (provinceId: string) => {
        setSelectedProvince(provinceId);
        setSelectedCity('');
        const params = new URLSearchParams(searchParams.toString());
        if (provinceId) {
            params.set('provinceId', provinceId);
        } else {
            params.delete('provinceId');
        }
        params.delete('cityId');
        params.delete('page');
        router.push(`/admin/customers?${params.toString()}`);
    };

    const handleCityChange = (cityId: string) => {
        setSelectedCity(cityId);
        const params = new URLSearchParams(searchParams.toString());
        if (cityId) {
            params.set('cityId', cityId);
        } else {
            params.delete('cityId');
        }
        params.delete('page');
        router.push(`/admin/customers?${params.toString()}`);
    };

    const handleGroupByChange = (value: string) => {
        setGroupByValue(value);
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('groupBy', value);
        } else {
            params.delete('groupBy');
        }
        params.delete('page');
        router.push(`/admin/customers?${params.toString()}`);
    };

    const handleSalesChange = (salesId: string) => {
        setSelectedSales(salesId);
        const params = new URLSearchParams(searchParams.toString());
        if (salesId) {
            params.set('salesId', salesId);
        } else {
            params.delete('salesId');
        }
        params.delete('page');
        const newURL = params.toString() ? `/admin/customers?${params.toString()}` : '/admin/customers';
        sessionStorage.setItem('customers-list-url', newURL);
        router.push(newURL);
    };

    const handlePackageChange = (packageId: string) => {
        setSelectedPackage(packageId);
        const params = new URLSearchParams(searchParams.toString());
        if (packageId) {
            params.set('packageId', packageId);
        } else {
            params.delete('packageId');
        }
        params.delete('page');
        const newURL = params.toString() ? `/admin/customers?${params.toString()}` : '/admin/customers';
        sessionStorage.setItem('customers-list-url', newURL);
        router.push(newURL);
    };

    const handleNextBillingDateFromChange = (date: string) => {
        setNextBillingFrom(date);
        const params = new URLSearchParams(searchParams.toString());
        if (date) {
            params.set('nextBillingDateFrom', date);
        } else {
            params.delete('nextBillingDateFrom');
        }
        params.delete('page');
        const newURL = params.toString() ? `/admin/customers?${params.toString()}` : '/admin/customers';
        sessionStorage.setItem('customers-list-url', newURL);
        router.push(newURL);
    };

    const handleNextBillingDateToChange = (date: string) => {
        setNextBillingTo(date);
        const params = new URLSearchParams(searchParams.toString());
        if (date) {
            params.set('nextBillingDateTo', date);
        } else {
            params.delete('nextBillingDateTo');
        }
        params.delete('page');
        const newURL = params.toString() ? `/admin/customers?${params.toString()}` : '/admin/customers';
        sessionStorage.setItem('customers-list-url', newURL);
        router.push(newURL);
    };

    const handleRevenueMinChange = (value: string) => {
        setRevenueMinValue(value);
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('revenueMin', value);
        } else {
            params.delete('revenueMin');
        }
        params.delete('page');
        const newURL = params.toString() ? `/admin/customers?${params.toString()}` : '/admin/customers';
        sessionStorage.setItem('customers-list-url', newURL);
        router.push(newURL);
    };

    const handleRevenueMaxChange = (value: string) => {
        setRevenueMaxValue(value);
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set('revenueMax', value);
        } else {
            params.delete('revenueMax');
        }
        params.delete('page');
        const newURL = params.toString() ? `/admin/customers?${params.toString()}` : '/admin/customers';
        sessionStorage.setItem('customers-list-url', newURL);
        router.push(newURL);
    };

    const handleItemsPerPageChange = (value: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('perPage', value.toString());
        params.delete('page');
        const newURL = params.toString() ? `/admin/customers?${params.toString()}` : '/admin/customers';
        sessionStorage.setItem('customers-list-url', newURL);
        router.push(newURL);
    };

    // Update URL when filters change (debounced for search)
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams();
            if (searchQuery) params.set('search', searchQuery);
            if (activeTab !== 'ALL') params.set('status', activeTab);
            if (selectedProvince) params.set('provinceId', selectedProvince);
            if (selectedCity) params.set('cityId', selectedCity);
            if (selectedSales) params.set('salesId', selectedSales);
            if (selectedPackage) params.set('packageId', selectedPackage);
            if (nextBillingFrom) params.set('nextBillingDateFrom', nextBillingFrom);
            if (nextBillingTo) params.set('nextBillingDateTo', nextBillingTo);
            if (revenueMinValue) params.set('revenueMin', revenueMinValue);
            if (revenueMaxValue) params.set('revenueMax', revenueMaxValue);
            if (groupByValue) params.set('groupBy', groupByValue);
            if (sortField) {
                params.set('sort', sortField);
                params.set('order', sortOrder);
            }
            if (itemsPerPage !== 20) params.set('perPage', itemsPerPage.toString());
            if (currentPage > 1) params.set('page', currentPage.toString());

            const newURL = params.toString() ? `/admin/customers?${params.toString()}` : '/admin/customers';
            // Simpan URL ke sessionStorage untuk digunakan di detail page
            sessionStorage.setItem('customers-list-url', newURL);
            router.push(newURL);
        }, searchQuery ? 500 : 0);

        return () => clearTimeout(timer);
    }, [searchQuery, activeTab, selectedProvince, selectedCity, selectedSales, selectedPackage, nextBillingFrom, nextBillingTo, revenueMinValue, revenueMaxValue, groupByValue, sortField, sortOrder, itemsPerPage, currentPage, router]);

    // Simpan URL saat pertama kali load
    useEffect(() => {
        const currentURL = window.location.pathname + window.location.search;
        sessionStorage.setItem('customers-list-url', currentURL);
    }, []);

    const handleSort = (field: SortField) => {
        if (!field) return;

        const params = new URLSearchParams(searchParams.toString());
        if (sortField === field) {
            const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
            params.set('sort', field);
            params.set('order', newOrder);
        } else {
            params.set('sort', field);
            params.set('order', 'asc');
        }
        params.delete('page');
        const newURL = params.toString() ? `/admin/customers?${params.toString()}` : '/admin/customers';
        sessionStorage.setItem('customers-list-url', newURL);
        router.push(newURL);
    };

    const getSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="h-4 w-4 inline ml-1 text-gray-400" />;
        return sortOrder === 'asc'
            ? <ArrowUp className="h-4 w-4 inline ml-1 text-indigo-600" />
            : <ArrowDown className="h-4 w-4 inline ml-1 text-indigo-600" />;
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'ACTIVE':
                return 'bg-green-100 text-green-800';
            case 'BLOCKED':
                return 'bg-red-100 text-red-800';
            case 'LEAD':
                return 'bg-yellow-100 text-yellow-800';
            case 'INACTIVE':
                return 'bg-gray-100 text-gray-800';
            case 'PENDING_INSTALL':
                return 'bg-blue-100 text-blue-800';
            case 'INSTALLED':
                return 'bg-purple-100 text-purple-800';
            case 'INSTALLED_PAYMENT_PENDING':
            case 'LEAD_PAYMENT_PENDING':
                return 'bg-orange-100 text-orange-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const handleStatusInquiry = async (customer: Customer) => {
        if (!customer.sales) return;

        if (!confirm(`Kirim pesan WhatsApp ke Sales "${customer.sales.name}" untuk menanyakan status pelanggan "${customer.name}"?`)) {
            return;
        }

        setInquiryLoading(customer.id);
        try {
            const result = await sendSalesStatusInquiry(customer.id);
            if (result.success) {
                alert(`✅ Notifikasi berhasil dikirim!\n\nPesan konfirmasi status pelanggan "${customer.name}" telah dikirim ke Sales "${customer.sales.name}".`);
            } else {
                alert(`❌ Gagal mengirim notifikasi: ${result.error}`);
            }
        } catch (error) {
            alert('Terjadi kesalahan sistem saat mengirim pesan');
        } finally {
            setInquiryLoading(null);
        }
    };

    const clearFilters = () => {
        setSelectedProvince('');
        setSelectedCity('');
        setSelectedSales('');
        setSelectedPackage('');
        setNextBillingFrom('');
        setNextBillingTo('');
        setRevenueMinValue('');
        setRevenueMaxValue('');
        setGroupByValue('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('provinceId');
        params.delete('cityId');
        params.delete('salesId');
        params.delete('packageId');
        params.delete('nextBillingDateFrom');
        params.delete('nextBillingDateTo');
        params.delete('revenueMin');
        params.delete('revenueMax');
        params.delete('groupBy');
        params.delete('page');
        router.push(`/admin/customers?${params.toString()}`);
    };

    return (
        <div>
            {/* Filters and Controls */}
            <div className="mb-4 space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    {/* Search Bar */}
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Cari pelanggan (nama, email, telepon)..."
                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            />
                        </div>
                    </div>

                    {/* Items Per Page */}
                    <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-700">Per Halaman:</label>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1"
                        >
                            {itemsPerPageOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    </div>

                    {/* Filter Toggle */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Filter
                    </button>
                    <ExportButton filters={{
                        search: searchQuery,
                        status: activeTab,
                        provinceId: selectedProvince,
                        cityId: selectedCity,
                        salesId: selectedSales,
                        packageId: selectedPackage,
                        nextBillingDateFrom: nextBillingFrom,
                        nextBillingDateTo: nextBillingTo,
                        revenueMin: revenueMinValue ? Number(revenueMinValue) : null,
                        revenueMax: revenueMaxValue ? Number(revenueMaxValue) : null,
                    }} />
                </div>

                {/* Advanced Filters */}
                {showFilters && (
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-700">Filter Lanjutan</h3>
                            <button
                                onClick={clearFilters}
                                className="text-xs text-indigo-600 hover:text-indigo-800"
                            >
                                Hapus Semua Filter
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Filter Wilayah */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Provinsi</label>
                                <select
                                    value={selectedProvince}
                                    onChange={(e) => handleProvinceChange(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                >
                                    <option value="">Semua Provinsi</option>
                                    {provinces.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Kota/Kabupaten</label>
                                <select
                                    value={selectedCity}
                                    onChange={(e) => handleCityChange(e.target.value)}
                                    disabled={!selectedProvince}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 disabled:bg-gray-100"
                                >
                                    <option value="">Semua Kota</option>
                                    {cities.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filter Sales */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Sales Person</label>
                                <select
                                    value={selectedSales}
                                    onChange={(e) => handleSalesChange(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                >
                                    <option value="">Semua Sales</option>
                                    {sales.map((s) => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filter Package */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Paket</label>
                                <select
                                    value={selectedPackage}
                                    onChange={(e) => handlePackageChange(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                >
                                    <option value="">Semua Paket</option>
                                    {packages.map((pkg) => (
                                        <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filter Next Billing Date */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tagihan Berikutnya Dari</label>
                                <input
                                    type="date"
                                    value={nextBillingFrom}
                                    onChange={(e) => handleNextBillingDateFromChange(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Tagihan Berikutnya Sampai</label>
                                <input
                                    type="date"
                                    value={nextBillingTo}
                                    onChange={(e) => handleNextBillingDateToChange(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>

                            {/* Filter Revenue */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Revenue Minimum (Rp)</label>
                                <input
                                    type="number"
                                    value={revenueMinValue}
                                    onChange={(e) => handleRevenueMinChange(e.target.value)}
                                    placeholder="0"
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Revenue Maksimum (Rp)</label>
                                <input
                                    type="number"
                                    value={revenueMaxValue}
                                    onChange={(e) => handleRevenueMaxChange(e.target.value)}
                                    placeholder="0"
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>

                            {/* Grouping */}
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Grouping</label>
                                <select
                                    value={groupByValue}
                                    onChange={(e) => handleGroupByChange(e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                >
                                    <option value="">Tidak Dikelompokkan</option>
                                    <option value="province">Kelompokkan per Provinsi</option>
                                    <option value="city">Kelompokkan per Kota</option>
                                </select>
                            </div>
                        </div>

                        {/* Revenue by Province */}
                        {revenueByProvince.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <h4 className="text-xs font-medium text-gray-700 mb-2">Total Revenue per Provinsi:</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {revenueByProvince.map((item: any) => (
                                        <div key={item.provinceId} className="bg-white p-2 rounded border border-gray-200">
                                            <div className="text-xs font-medium text-gray-900">{item.provinceName}</div>
                                            <div className="text-xs text-gray-600">{item.count} pelanggan</div>
                                            <div className="text-xs font-semibold text-indigo-600">
                                                Rp {item.totalRevenue.toLocaleString('id-ID')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Status Cards */}
            <div className="mb-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {STATUS_TABS.map((tab) => {
                    const count = tab.value === 'ALL' ? totalCustomers : (statusCounts[tab.value] || 0);
                    const isActive = activeTab === tab.value;
                    const Icon = tab.icon;

                    const colorClasses = {
                        indigo: {
                            bg: 'bg-indigo-50',
                            border: 'border-indigo-500',
                            text: 'text-indigo-600',
                            iconBg: 'bg-indigo-100',
                            iconText: 'text-indigo-600',
                            activeBg: 'bg-indigo-100',
                        },
                        gray: {
                            bg: 'bg-gray-50',
                            border: 'border-gray-500',
                            text: 'text-gray-600',
                            iconBg: 'bg-gray-100',
                            iconText: 'text-gray-600',
                            activeBg: 'bg-gray-100',
                        },
                        yellow: {
                            bg: 'bg-yellow-50',
                            border: 'border-yellow-500',
                            text: 'text-yellow-600',
                            iconBg: 'bg-yellow-100',
                            iconText: 'text-yellow-600',
                            activeBg: 'bg-yellow-100',
                        },
                        orange: {
                            bg: 'bg-orange-50',
                            border: 'border-orange-500',
                            text: 'text-orange-600',
                            iconBg: 'bg-orange-100',
                            iconText: 'text-orange-600',
                            activeBg: 'bg-orange-100',
                        },
                        blue: {
                            bg: 'bg-blue-50',
                            border: 'border-blue-500',
                            text: 'text-blue-600',
                            iconBg: 'bg-blue-100',
                            iconText: 'text-blue-600',
                            activeBg: 'bg-blue-100',
                        },
                        amber: {
                            bg: 'bg-amber-50',
                            border: 'border-amber-500',
                            text: 'text-amber-600',
                            iconBg: 'bg-amber-100',
                            iconText: 'text-amber-600',
                            activeBg: 'bg-amber-100',
                        },
                        green: {
                            bg: 'bg-green-50',
                            border: 'border-green-500',
                            text: 'text-green-600',
                            iconBg: 'bg-green-100',
                            iconText: 'text-green-600',
                            activeBg: 'bg-green-100',
                        },
                        red: {
                            bg: 'bg-red-50',
                            border: 'border-red-500',
                            text: 'text-red-600',
                            iconBg: 'bg-red-100',
                            iconText: 'text-red-600',
                            activeBg: 'bg-red-100',
                        },
                    };

                    const colors = colorClasses[tab.color as keyof typeof colorClasses] || colorClasses.gray;

                    return (
                        <button
                            key={tab.value}
                            onClick={() => handleTabChange(tab.value)}
                            className={`
                                bg-white p-4 rounded-lg shadow border-l-4 transition-all hover:shadow-md
                                ${isActive ? `${colors.border} ${colors.activeBg}` : 'border-gray-300 hover:border-gray-400'}
                            `}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className={`p-2 rounded-lg ${colors.iconBg} ${colors.iconText}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                {isActive && (
                                    <div className={`w-2 h-2 rounded-full ${colors.bg.replace('50', '500')}`}></div>
                                )}
                            </div>
                            <div className="text-left">
                                <div className={`text-xs font-medium mb-1 ${isActive ? colors.text : 'text-gray-500'}`}>
                                    {tab.label}
                                </div>
                                <div className={`text-2xl font-bold ${isActive ? colors.text : 'text-gray-700'}`}>
                                    {count}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Customers Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                {isGrouped && (
                                    <>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Wilayah
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total Pelanggan
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total Revenue
                                        </th>
                                    </>
                                )}
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => !isGrouped && handleSort('name')}
                                >
                                    Nama / ID {!isGrouped && getSortIcon('name')}
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => !isGrouped && handleSort('package')}
                                >
                                    Paket {!isGrouped && getSortIcon('package')}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sales
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th
                                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                                    onClick={() => !isGrouped && handleSort('nextBillingDate')}
                                >
                                    Tagihan Berikutnya {!isGrouped && getSortIcon('nextBillingDate')}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {isGrouped ? (
                                // Grouped view
                                customers.map((group: any, idx: number) => (
                                    <React.Fragment key={idx}>
                                        <tr className="bg-indigo-50">
                                            <td colSpan={8} className="px-6 py-3">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <span className="text-sm font-semibold text-gray-900">{group.region}</span>
                                                        <span className="ml-4 text-xs text-gray-600">
                                                            {group.count} pelanggan
                                                        </span>
                                                    </div>
                                                    <div className="text-sm font-semibold text-indigo-600">
                                                        Total Revenue: Rp {group.totalRevenue.toLocaleString('id-ID')}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                        {group.customers?.map((customer: Customer) => (
                                            <tr key={customer.id}>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                                    <div className="text-xs text-gray-500">{customer.email || '-'}</div>
                                                    <div className="text-xs text-gray-500">{customer.phone}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{customer.subscription?.planName || '-'}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {customer.subscription?.price ? `Rp ${Number(customer.subscription.price).toLocaleString('id-ID')}` : '-'}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {customer.sales?.name || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(customer.status)}`}>
                                                        {customer.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {customer.subscription?.nextBillingDate ? formatDate(customer.subscription.nextBillingDate) : '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <div className="flex justify-end gap-2 items-center">
                                                        {customer.status === 'INACTIVE' && activeTab === 'DELETED' ? (
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm(`Apakah Anda yakin ingin memulihkan pelanggan "${customer.name}"?`)) {
                                                                        const { restoreCustomer } = await import('./actions');
                                                                        const result = await restoreCustomer(customer.id);
                                                                        if (result.success) {
                                                                            alert('Pelanggan berhasil dipulihkan');
                                                                        } else {
                                                                            alert(`Gagal memulihkan: ${result.error}`);
                                                                        }
                                                                    }
                                                                }}
                                                                className="text-green-600 hover:text-green-900 border border-green-600 rounded px-2 py-1 text-xs"
                                                            >
                                                                Restore
                                                            </button>
                                                        ) : (
                                                            <>
                                                                {customer.sales?.phone && (
                                                                    <button
                                                                        onClick={() => handleStatusInquiry(customer)}
                                                                        disabled={inquiryLoading === customer.id}
                                                                        title={customer.lastSalesInquirySentAt
                                                                            ? `Terakhir dikirim: ${formatDate(customer.lastSalesInquirySentAt)}`
                                                                            : "Tanya Status ke Sales"}
                                                                        className={`hover:text-teal-900 disabled:opacity-50 ${customer.lastSalesInquirySentAt
                                                                            ? "text-purple-600"
                                                                            : "text-teal-600"
                                                                            }`}
                                                                    >
                                                                        {inquiryLoading === customer.id ? (
                                                                            <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                                                        ) : (
                                                                            <>
                                                                                <MessageCircleQuestion className="w-5 h-5 inline-block" />
                                                                                {customer.lastSalesInquirySentAt && (
                                                                                    <span className="ml-1 text-[10px] font-bold bg-purple-100 text-purple-800 px-1 rounded-full">
                                                                                        Sent
                                                                                    </span>
                                                                                )}
                                                                            </>
                                                                        )}
                                                                    </button>
                                                                )}
                                                                <Link href={`/admin/customers/${customer.id}`} className="text-indigo-600 hover:text-indigo-900">
                                                                    Detail
                                                                </Link>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))
                            ) : (
                                // Normal view
                                customers.map((customer) => (
                                    <tr key={customer.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                            <div className="text-xs text-gray-500">{customer.email || '-'}</div>
                                            <div className="text-xs text-gray-500">{customer.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{customer.subscription?.planName || '-'}</div>
                                            <div className="text-xs text-gray-500">
                                                {customer.subscription?.price ? `Rp ${Number(customer.subscription.price).toLocaleString('id-ID')}` : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {customer.sales?.name || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(customer.status)}`}>
                                                {customer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {customer.subscription?.nextBillingDate ? formatDate(customer.subscription.nextBillingDate) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2 items-center">
                                                {customer.status === 'INACTIVE' && activeTab === 'DELETED' ? (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`Apakah Anda yakin ingin memulihkan pelanggan "${customer.name}"?`)) {
                                                                const { restoreCustomer } = await import('./actions');
                                                                const result = await restoreCustomer(customer.id);
                                                                if (result.success) {
                                                                    alert('Pelanggan berhasil dipulihkan');
                                                                } else {
                                                                    alert(`Gagal memulihkan: ${result.error}`);
                                                                }
                                                            }
                                                        }}
                                                        className="text-green-600 hover:text-green-900 border border-green-600 rounded px-2 py-1 text-xs"
                                                    >
                                                        Restore
                                                    </button>
                                                ) : (
                                                    <>
                                                        {customer.sales?.phone && (
                                                            <button
                                                                onClick={() => handleStatusInquiry(customer)}
                                                                disabled={inquiryLoading === customer.id}
                                                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                                title="Tanya Status ke Sales via WhatsApp"
                                                            >
                                                                {inquiryLoading === customer.id ? (
                                                                    <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                                                                ) : (
                                                                    <MessageCircleQuestion className="w-5 h-5" />
                                                                )}
                                                            </button>
                                                        )}
                                                        <Link href={`/admin/customers/${customer.id}`} className="text-indigo-600 hover:text-indigo-900">
                                                            Detail
                                                        </Link>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan={isGrouped ? 8 : 6} className="px-6 py-4 text-center text-sm text-gray-500">
                                        {searchQuery ? 'Tidak ada pelanggan yang sesuai dengan pencarian.' : 'Belum ada pelanggan.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
