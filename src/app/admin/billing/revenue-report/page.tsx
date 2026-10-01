'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DollarSign, Download, TrendingUp, TrendingDown, Filter, X, Calendar, Search, ChevronDown, FileText, Mail, AlertCircle, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

type PeriodType = 'yesterday' | '1day' | '7days' | '1month' | '3months' | '6months' | 'ytd' | 'custom' | 'legacy';

interface RevenueData {
    period: PeriodType;
    dateRange: {
        start: string;
        end: string;
    };
    summary: {
        totalRevenue: number;
        transactionCount: number;
        averageTransaction: number;
        revenueChange: number;
        transactionChange: number;
        averageChange: number;
        overdueAmount?: number;
        overdueCount?: number;
    };
    previousPeriod: {
        totalRevenue: number;
        transactionCount: number;
        averageTransaction: number;
    };
    categoryBreakdown: Record<string, { revenue: number; count: number }>;
    dailyBreakdown: { date: string; revenue: number }[];
    transactions: Array<{
        id: string;
        invoiceNumber: string | null;
        amount: number;
        paidAt: string | null;
        category: string;
        type: string;
        description: string | null;
        user: {
            id: string;
            name: string;
            phone: string;
            sales: { id: string; name: string } | null;
            location: {
                province: string | null;
                city: string | null;
                district: string | null;
                village: string | null;
            };
            package: string | null;
        };
    }>;
}

interface FilterData {
    sales: Array<{ id: string; name: string }>;
    packages: Array<{ id: string; name: string }>;
    provinces: Array<{ id: string; name: string }>;
}

const PERIOD_LABELS: Record<PeriodType, string> = {
    'yesterday': 'Kemarin',
    '1day': 'Hari Ini',
    '7days': '7 Hari Terakhir',
    '1month': 'Bulan Ini',
    '3months': '3 Bulan Terakhir',
    '6months': '6 Bulan Terakhir',
    'ytd': 'Tahun Ini (YTD)',
    'custom': 'Custom Range',
    'legacy': 'Sistem Lama',
};

const CATEGORY_LABELS: Record<string, string> = {
    INSTALLATION_FEE: 'Biaya Instalasi',
    FIRST_MONTH: 'Bulan Pertama',
    REGULAR_MONTHLY: 'Bulanan Reguler',
    PREPAID_3_MONTHS: 'Prepaid 3 Bulan',
    PREPAID_6_MONTHS: 'Prepaid 6 Bulan',
    PREPAID_12_MONTHS: 'Prepaid 12 Bulan',
    TRIAL_PERIOD: 'Trial Period',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function RevenueReportPage() {
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('yesterday');
    const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
    const [loading, setLoading] = useState(false);
    const [customDateRange, setCustomDateRange] = useState({
        startDate: '',
        endDate: '',
    });
    const [showCustomSearch, setShowCustomSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showSendReport, setShowSendReport] = useState(false);
    const [sendReportData, setSendReportData] = useState({
        email: '',
        phone: '',
        sendVia: 'email' as 'email' | 'whatsapp',
    });
    const [filterData, setFilterData] = useState<FilterData>({
        sales: [],
        packages: [],
        provinces: [],
    });
    const [filters, setFilters] = useState({
        salesId: '',
        packageId: '',
        provinceId: '',
        cityId: '',
        districtId: '',
        villageId: '',
        category: '',
        startDate: '',
        endDate: '',
    });
    const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
    const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
    const [villages, setVillages] = useState<Array<{ id: string; name: string }>>([]);

    // Load filter options
    useEffect(() => {
        async function loadFilterData() {
            try {
                const [salesRes, packagesRes, provincesRes] = await Promise.all([
                    fetch('/api/admin/sales'),
                    fetch('/api/admin/packages'),
                    fetch('/api/admin/locations/provinces'),
                ]);

                const sales = salesRes.ok ? await salesRes.json() : { data: [] };
                const packages = packagesRes.ok ? await packagesRes.json() : { data: [] };
                const provinces = provincesRes.ok ? await provincesRes.json() : { data: [] };

                setFilterData({
                    sales: sales.data || [],
                    packages: packages.data || [],
                    provinces: provinces.data || [],
                });
            } catch (error) {
                console.error('Error loading filter data:', error);
            }
        }
        loadFilterData();
    }, []);

    // Load cities when province changes
    useEffect(() => {
        if (filters.provinceId) {
            fetch(`/api/admin/locations/cities?provinceId=${filters.provinceId}`)
                .then(res => res.json())
                .then(data => setCities(data.data || []))
                .catch(err => console.error('Error loading cities:', err));
        } else {
            setCities([]);
            setDistricts([]);
            setVillages([]);
        }
    }, [filters.provinceId]);

    // Load districts when city changes
    useEffect(() => {
        if (filters.cityId) {
            fetch(`/api/admin/locations/districts?cityId=${filters.cityId}`)
                .then(res => res.json())
                .then(data => setDistricts(data.data || []))
                .catch(err => console.error('Error loading districts:', err));
        } else {
            setDistricts([]);
            setVillages([]);
        }
    }, [filters.cityId]);

    // Load villages when district changes
    useEffect(() => {
        if (filters.districtId) {
            fetch(`/api/admin/locations/villages?districtId=${filters.districtId}`)
                .then(res => res.json())
                .then(data => setVillages(data.data || []))
                .catch(err => console.error('Error loading villages:', err));
        } else {
            setVillages([]);
        }
    }, [filters.districtId]);

    // Load revenue data when period changes
    useEffect(() => {
        loadRevenueData();
    }, [selectedPeriod, filters]);

    const loadRevenueData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('period', selectedPeriod);
            if (filters.salesId) params.append('salesId', filters.salesId);
            if (filters.packageId) params.append('packageId', filters.packageId);
            if (filters.provinceId) params.append('provinceId', filters.provinceId);
            if (filters.cityId) params.append('cityId', filters.cityId);
            if (filters.districtId) params.append('districtId', filters.districtId);
            if (filters.villageId) params.append('villageId', filters.villageId);
            if (filters.category) params.append('category', filters.category);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (selectedPeriod === 'custom' && customDateRange.startDate) {
                params.append('startDate', customDateRange.startDate);
            }
            if (selectedPeriod === 'custom' && customDateRange.endDate) {
                params.append('endDate', customDateRange.endDate);
            }

            const response = await fetch(`/api/admin/billing/revenue-report?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setRevenueData(result.data);
            }
        } catch (error) {
            console.error('Error loading revenue data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomDateSearch = () => {
        if (!customDateRange.startDate || !customDateRange.endDate) {
            alert('Mohon pilih tanggal mulai dan tanggal akhir');
            return;
        }

        if (new Date(customDateRange.startDate) > new Date(customDateRange.endDate)) {
            alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir');
            return;
        }

        setSelectedPeriod('custom');
        setShowCustomSearch(false);
    };

    const setQuickDateRange = (range: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear') => {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        let start = new Date();
        let end = new Date(today);

        switch (range) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                break;
            case 'yesterday':
                start.setDate(start.getDate() - 1);
                start.setHours(0, 0, 0, 0);
                end.setDate(end.getDate() - 1);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisWeek':
                const dayOfWeek = start.getDay();
                const diff = start.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                start = new Date(start.setDate(diff));
                start.setHours(0, 0, 0, 0);
                break;
            case 'lastWeek':
                const lastWeekStart = new Date(start);
                lastWeekStart.setDate(start.getDate() - 7);
                const lastDayOfWeek = lastWeekStart.getDay();
                const lastDiff = lastWeekStart.getDate() - lastDayOfWeek + (lastDayOfWeek === 0 ? -6 : 1);
                start = new Date(lastWeekStart.setDate(lastDiff));
                start.setHours(0, 0, 0, 0);
                end = new Date(start);
                end.setDate(end.getDate() + 6);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisMonth':
                start = new Date(today.getFullYear(), today.getMonth(), 1);
                start.setHours(0, 0, 0, 0);
                break;
            case 'lastMonth':
                start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                start.setHours(0, 0, 0, 0);
                end = new Date(today.getFullYear(), today.getMonth(), 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisYear':
                start = new Date(today.getFullYear(), 0, 1);
                start.setHours(0, 0, 0, 0);
                break;
        }

        setCustomDateRange({
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
        });
    };

    const handleApplyFilters = () => {
        loadRevenueData();
    };

    const handleResetFilters = () => {
        setFilters({
            salesId: '',
            packageId: '',
            provinceId: '',
            cityId: '',
            districtId: '',
            villageId: '',
            category: '',
            startDate: '',
            endDate: '',
        });
        setCities([]);
        setDistricts([]);
        setVillages([]);
    };

    const handleSendReport = async () => {
        if (sendReportData.sendVia === 'email' && !sendReportData.email) {
            alert('Mohon masukkan email');
            return;
        }

        if (sendReportData.sendVia === 'whatsapp' && !sendReportData.phone) {
            alert('Mohon masukkan nomor WhatsApp');
            return;
        }

        try {
            const response = await fetch('/api/admin/billing/revenue-report/send-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sendVia: sendReportData.sendVia,
                    email: sendReportData.sendVia === 'email' ? sendReportData.email : undefined,
                    phone: sendReportData.sendVia === 'whatsapp' ? sendReportData.phone : undefined,
                    period: selectedPeriod,
                    startDate: selectedPeriod === 'custom' ? customDateRange.startDate : undefined,
                    endDate: selectedPeriod === 'custom' ? customDateRange.endDate : undefined,
                    filters: {
                        category: filters.category || undefined,
                        salesId: filters.salesId || undefined,
                        packageId: filters.packageId || undefined,
                        provinceId: filters.provinceId || undefined,
                        cityId: filters.cityId || undefined,
                        districtId: filters.districtId || undefined,
                        villageId: filters.villageId || undefined,
                    },
                }),
            });

            const result = await response.json();
            if (result.success) {
                const destination = sendReportData.sendVia === 'email' ? sendReportData.email : sendReportData.phone;
                alert(`Laporan PDF berhasil dikirim ke ${destination}${result.note ? '\n' + result.note : ''}`);
                setShowSendReport(false);
                setSendReportData({ email: '', phone: '', sendVia: 'email' });
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleExport = async () => {
        const params = new URLSearchParams();
        params.append('period', selectedPeriod);
        if (filters.salesId) params.append('salesId', filters.salesId);
        if (filters.packageId) params.append('packageId', filters.packageId);
        if (filters.provinceId) params.append('provinceId', filters.provinceId);
        if (filters.cityId) params.append('cityId', filters.cityId);
        if (filters.districtId) params.append('districtId', filters.districtId);
        if (filters.villageId) params.append('villageId', filters.villageId);
        if (filters.category) params.append('category', filters.category);
        if (selectedPeriod === 'custom' && customDateRange.startDate) {
            params.append('startDate', customDateRange.startDate);
        }
        if (selectedPeriod === 'custom' && customDateRange.endDate) {
            params.append('endDate', customDateRange.endDate);
        }
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        window.open(`/api/admin/billing/revenue-report/export?${params.toString()}`, '_blank');
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatChange = (change: number) => {
        const sign = change >= 0 ? '+' : '';
        return `${sign}${change.toFixed(2)}%`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <DollarSign className="w-6 h-6" />
                        Laporan Revenue
                    </h2>
                    <p className="text-gray-600 mt-1">Analisis uang masuk berdasarkan periode</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCustomSearch(!showCustomSearch)}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        Custom Date
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                            showFilters 
                                ? 'bg-indigo-600 text-white border-indigo-600' 
                                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                        }`}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </button>
                    {revenueData && (
                        <>
                            <button
                                onClick={handleExport}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export
                            </button>
                            <button
                                onClick={() => setShowSendReport(true)}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-green-700"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Kirim Laporan
                            </button>
                        </>
                    )}
                    <Link
                        href="/admin/billing"
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Kembali
                    </Link>
                </div>
            </div>

            {/* Custom Date Range Search */}
            {showCustomSearch && (
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Custom Date Range
                        </h3>
                        <button
                            onClick={() => setShowCustomSearch(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Quick Select:</label>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setQuickDateRange('today')}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                    Hari Ini
                                </button>
                                <button
                                    onClick={() => setQuickDateRange('yesterday')}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                    Kemarin
                                </button>
                                <button
                                    onClick={() => setQuickDateRange('thisWeek')}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                    Minggu Ini
                                </button>
                                <button
                                    onClick={() => setQuickDateRange('lastWeek')}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                    Minggu Lalu
                                </button>
                                <button
                                    onClick={() => setQuickDateRange('thisMonth')}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                    Bulan Ini
                                </button>
                                <button
                                    onClick={() => setQuickDateRange('lastMonth')}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                    Bulan Lalu
                                </button>
                                <button
                                    onClick={() => setQuickDateRange('thisYear')}
                                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                    Tahun Ini
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                                <input
                                    type="date"
                                    value={customDateRange.startDate}
                                    onChange={(e) => setCustomDateRange({ ...customDateRange, startDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
                                <input
                                    type="date"
                                    value={customDateRange.endDate}
                                    onChange={(e) => setCustomDateRange({ ...customDateRange, endDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={handleCustomDateSearch}
                                className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                <Search className="w-4 h-4 mr-2" />
                                Cari Revenue
                            </button>
                            <button
                                onClick={() => {
                                    setCustomDateRange({ startDate: '', endDate: '' });
                                    setShowCustomSearch(false);
                                }}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Filter className="w-5 h-5" />
                            Filter Data
                        </h3>
                        <button
                            onClick={() => setShowFilters(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sales</label>
                            <select
                                value={filters.salesId}
                                onChange={(e) => setFilters({ ...filters, salesId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Semua Sales</option>
                                {filterData.sales.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Paket</label>
                            <select
                                value={filters.packageId}
                                onChange={(e) => setFilters({ ...filters, packageId: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Semua Paket</option>
                                {filterData.packages.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Provinsi</label>
                            <select
                                value={filters.provinceId}
                                onChange={(e) => setFilters({ ...filters, provinceId: e.target.value, cityId: '', districtId: '', villageId: '' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Semua Provinsi</option>
                                {filterData.provinces.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kota</label>
                            <select
                                value={filters.cityId}
                                onChange={(e) => setFilters({ ...filters, cityId: e.target.value, districtId: '', villageId: '' })}
                                disabled={!filters.provinceId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                            >
                                <option value="">Semua Kota</option>
                                {cities.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kecamatan</label>
                            <select
                                value={filters.districtId}
                                onChange={(e) => setFilters({ ...filters, districtId: e.target.value, villageId: '' })}
                                disabled={!filters.cityId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                            >
                                <option value="">Semua Kecamatan</option>
                                {districts.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kelurahan</label>
                            <select
                                value={filters.villageId}
                                onChange={(e) => setFilters({ ...filters, villageId: e.target.value })}
                                disabled={!filters.districtId}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                            >
                                <option value="">Semua Kelurahan</option>
                                {villages.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Semua Kategori</option>
                                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end gap-2">
                            <button
                                onClick={handleApplyFilters}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                            >
                                Terapkan
                            </button>
                            <button
                                onClick={handleResetFilters}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                            >
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Report Modal */}
            {showSendReport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Kirim Laporan PDF</h3>
                            <button
                                onClick={() => {
                                    setShowSendReport(false);
                                    setSendReportData({ email: '', phone: '', sendVia: 'email' });
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {/* Send Via Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Kirim Via</label>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSendReportData({ ...sendReportData, sendVia: 'email' })}
                                        className={`flex-1 px-4 py-2 rounded-md border-2 transition-colors ${
                                            sendReportData.sendVia === 'email'
                                                ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <Mail className="w-4 h-4 inline mr-2" />
                                        Email
                                    </button>
                                    <button
                                        onClick={() => setSendReportData({ ...sendReportData, sendVia: 'whatsapp' })}
                                        className={`flex-1 px-4 py-2 rounded-md border-2 transition-colors ${
                                            sendReportData.sendVia === 'whatsapp'
                                                ? 'bg-green-50 border-green-500 text-green-700'
                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                                        }`}
                                    >
                                        <MessageSquare className="w-4 h-4 inline mr-2" />
                                        WhatsApp
                                    </button>
                                </div>
                            </div>

                            {/* Email Input */}
                            {sendReportData.sendVia === 'email' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Tujuan</label>
                                    <input
                                        type="email"
                                        value={sendReportData.email}
                                        onChange={(e) => setSendReportData({ ...sendReportData, email: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="contoh@email.com"
                                    />
                                </div>
                            )}

                            {/* WhatsApp Input */}
                            {sendReportData.sendVia === 'whatsapp' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={sendReportData.phone}
                                        onChange={(e) => setSendReportData({ ...sendReportData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                        placeholder="081234567890"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Format: 08xx atau 628xx</p>
                                </div>
                            )}

                            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                <p className="text-sm text-blue-800">
                                    <strong>Catatan:</strong> Laporan akan dikirim dalam format PDF dengan chart visual lengkap.
                                </p>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleSendReport}
                                    className={`flex-1 px-4 py-2 text-white rounded-md hover:opacity-90 ${
                                        sendReportData.sendVia === 'email'
                                            ? 'bg-indigo-600 hover:bg-indigo-700'
                                            : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                >
                                    Kirim PDF
                                </button>
                                <button
                                    onClick={() => {
                                        setShowSendReport(false);
                                        setSendReportData({ email: '', phone: '', sendVia: 'email' });
                                    }}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Period Selector */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                    <label className="text-sm font-semibold text-gray-700">Pilih Periode:</label>
                    {revenueData && (
                        <span className="text-sm text-gray-500">
                            {formatDate(revenueData.dateRange.start)} - {formatDate(revenueData.dateRange.end)}
                        </span>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {(['yesterday', '1day', '7days', '1month', '3months', '6months', 'ytd', 'legacy'] as PeriodType[]).map((period) => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                selectedPeriod === period
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            {PERIOD_LABELS[period]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            {loading ? (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Memuat data revenue...</p>
                </div>
            ) : revenueData ? (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-white/20 p-3 rounded-lg">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                {revenueData.summary.revenueChange !== 0 && (
                                    <div className={`flex items-center gap-1 text-sm ${revenueData.summary.revenueChange >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                                        {revenueData.summary.revenueChange >= 0 ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4" />
                                        )}
                                        {formatChange(revenueData.summary.revenueChange)}
                                    </div>
                                )}
                            </div>
                            <div className="text-sm opacity-90 mb-1">Total Revenue</div>
                            <div className="text-3xl font-bold mb-2">{formatCurrency(revenueData.summary.totalRevenue)}</div>
                            <div className="text-xs opacity-75">dari periode sebelumnya</div>
                        </div>

                        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-white/20 p-3 rounded-lg">
                                    <FileText className="w-6 h-6" />
                                </div>
                                {revenueData.summary.transactionChange !== 0 && (
                                    <div className={`flex items-center gap-1 text-sm ${revenueData.summary.transactionChange >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                                        {revenueData.summary.transactionChange >= 0 ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4" />
                                        )}
                                        {formatChange(revenueData.summary.transactionChange)}
                                    </div>
                                )}
                            </div>
                            <div className="text-sm opacity-90 mb-1">Jumlah Transaksi</div>
                            <div className="text-3xl font-bold mb-2">{revenueData.summary.transactionCount}</div>
                            <div className="text-xs opacity-75">transaksi pembayaran</div>
                        </div>

                        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                            <div className="flex items-center justify-between mb-4">
                                <div className="bg-white/20 p-3 rounded-lg">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                {revenueData.summary.averageChange !== 0 && (
                                    <div className={`flex items-center gap-1 text-sm ${revenueData.summary.averageChange >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                                        {revenueData.summary.averageChange >= 0 ? (
                                            <TrendingUp className="w-4 h-4" />
                                        ) : (
                                            <TrendingDown className="w-4 h-4" />
                                        )}
                                        {formatChange(revenueData.summary.averageChange)}
                                    </div>
                                )}
                            </div>
                            <div className="text-sm opacity-90 mb-1">Rata-rata per Transaksi</div>
                            <div className="text-3xl font-bold mb-2">{formatCurrency(revenueData.summary.averageTransaction)}</div>
                            <div className="text-xs opacity-75">per transaksi</div>
                        </div>

                        {(revenueData.summary.overdueAmount !== undefined && revenueData.summary.overdueAmount > 0) && (
                            <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="bg-white/20 p-3 rounded-lg">
                                        <AlertCircle className="w-6 h-6" />
                                    </div>
                                </div>
                                <div className="text-sm opacity-90 mb-1">Piutang Terlambat</div>
                                <div className="text-3xl font-bold mb-2">{formatCurrency(revenueData.summary.overdueAmount)}</div>
                                <div className="text-xs opacity-75">{revenueData.summary.overdueCount || 0} invoice</div>
                            </div>
                        )}
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Daily Revenue Chart */}
                        {revenueData.dailyBreakdown.length > 0 && (
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue per Hari</h3>
                                <ResponsiveContainer width="100%" height={350}>
                                    <BarChart data={revenueData.dailyBreakdown}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                        <XAxis
                                            dataKey="date"
                                            angle={-45}
                                            textAnchor="end"
                                            height={100}
                                            tickFormatter={(value) => formatDate(value)}
                                            stroke="#6b7280"
                                        />
                                        <YAxis stroke="#6b7280" />
                                        <Tooltip
                                            formatter={(value: number) => formatCurrency(value)}
                                            labelFormatter={(label) => formatDate(label)}
                                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} name="Revenue" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        {/* Category Breakdown Pie Chart */}
                        {Object.keys(revenueData.categoryBreakdown).length > 0 && (
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Breakdown per Kategori</h3>
                                <ResponsiveContainer width="100%" height={350}>
                                    <PieChart>
                                        <Pie
                                            data={Object.entries(revenueData.categoryBreakdown).map(([key, value]) => ({
                                                name: CATEGORY_LABELS[key] || key,
                                                value: value.revenue,
                                            }))}
                                            cx="50%"
                                            cy="50%"
                                            labelLine={false}
                                            label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                            outerRadius={100}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {Object.keys(revenueData.categoryBreakdown).map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            formatter={(value: number) => formatCurrency(value)}
                                            contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Category Breakdown Table */}
                    {Object.keys(revenueData.categoryBreakdown).length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail per Kategori</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Kategori</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Revenue</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Jumlah Transaksi</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Rata-rata</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {Object.entries(revenueData.categoryBreakdown).map(([key, value]) => (
                                            <tr key={key} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {CATEGORY_LABELS[key] || key}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                                    {formatCurrency(value.revenue)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                    {value.count}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                    {formatCurrency(value.revenue / value.count)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Transactions Table */}
                    {revenueData.transactions.length > 0 && (
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Detail Transaksi</h3>
                                <span className="text-sm text-gray-500">{revenueData.transactions.length} transaksi</span>
                            </div>
                            <div className="overflow-x-auto max-h-96 overflow-y-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tanggal</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pelanggan</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sales</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Lokasi</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Kategori</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Jumlah</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {revenueData.transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {tx.invoiceNumber || `#${tx.id.slice(-6).toUpperCase()}`}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {tx.paidAt ? formatDate(tx.paidAt) : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-medium text-gray-900">{tx.user.name}</div>
                                                    <div className="text-gray-500">{tx.user.phone}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {tx.user.sales?.name || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {[
                                                        tx.user.location.city,
                                                        tx.user.location.district,
                                                    ].filter(Boolean).join(', ') || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {CATEGORY_LABELS[tx.category] || tx.category}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                    {formatCurrency(tx.amount)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Pilih periode untuk melihat laporan revenue</p>
                </div>
            )}
        </div>
    );
}
