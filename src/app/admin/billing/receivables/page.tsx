'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
    DollarSign,
    Download,
    Filter,
    X,
    Calendar,
    Search,
    FileText,
    Users,
    AlertCircle,
    Clock,
    Mail,
    Eye,
    MessageSquare,
    Edit,
    CheckCircle,
    XCircle,
    AlertTriangle,
    MinusCircle
} from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

type CollectionStatus = 'NOT_COLLECTED' | 'COLLECTING' | 'PENDING_CONFIRMATION' | 'DISPUTE' | 'WRITE_OFF';

interface Receivable {
    id: string;
    invoiceNumber: string | null;
    createdAt: string;
    dueDate: string;
    aging: number;
    agingBucket: string;
    amount: number;
    status: string;
    category: string;
    collectionStatus: CollectionStatus | null;
    collectionNotes: string | null;
    user: {
        id: string;
        name: string;
        phone: string;
        email: string | null;
        status: string;
        sales: {
            id: string;
            name: string;
            phone: string;
        } | null;
        province: { name: string } | null;
        city: { name: string } | null;
        district: { name: string } | null;
        village: { name: string } | null;
    };
}

interface ReceivablesData {
    invoices: Receivable[];
    summary: {
        totalReceivable: number;
        currentReceivable: number;
        overdueReceivable: number;
        customerCount: number;
        averageReceivable: number;
        invoiceCount: number;
    };
    agingBuckets: Record<string, { count: number; amount: number }>;
    categoryBreakdown: Record<string, { count: number; amount: number }>;
    collectionStatusBreakdown: Record<string, { count: number; amount: number }>;
}

interface FilterData {
    sales: Array<{ id: string; name: string }>;
    packages: Array<{ id: string; name: string }>;
    provinces: Array<{ id: string; name: string }>;
}

const CATEGORY_LABELS: Record<string, string> = {
    INSTALLATION_FEE: 'Biaya Instalasi',
    FIRST_MONTH: 'Bulan Pertama',
    REGULAR_MONTHLY: 'Bulanan Reguler',
    PREPAID_3_MONTHS: 'Prepaid 3 Bulan',
    PREPAID_6_MONTHS: 'Prepaid 6 Bulan',
    PREPAID_12_MONTHS: 'Prepaid 12 Bulan',
    TRIAL_PERIOD: 'Trial Period',
};

const COLLECTION_STATUS_LABELS: Record<CollectionStatus, string> = {
    NOT_COLLECTED: 'Belum Ditagih',
    COLLECTING: 'Sedang Ditagih',
    PENDING_CONFIRMATION: 'Menunggu Konfirmasi',
    DISPUTE: 'Dispute',
    WRITE_OFF: 'Write-off',
};

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

function ReceivablesContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'aging' | 'customer'>('overview');
    const [data, setData] = useState<ReceivablesData | null>(null);
    const [loading, setLoading] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [showDateRange, setShowDateRange] = useState(false);
    const [showSendReport, setShowSendReport] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
    const [customerData, setCustomerData] = useState<any>(null);

    const [filterData, setFilterData] = useState<FilterData>({
        sales: [],
        packages: [],
        provinces: [],
    });

    // Initialize filters from URL parameters
    const getFiltersFromURL = useCallback(() => {
        return {
            status: searchParams.get('status')?.split(',').filter(Boolean) || [],
            category: searchParams.get('category') || '',
            salesId: searchParams.get('salesId') || '',
            packageId: searchParams.get('packageId') || '',
            provinceId: searchParams.get('provinceId') || '',
            cityId: searchParams.get('cityId') || '',
            districtId: searchParams.get('districtId') || '',
            villageId: searchParams.get('villageId') || '',
            collectionStatus: (searchParams.get('collectionStatus') as CollectionStatus | null) || '',
            agingBucket: searchParams.get('agingBucket') || '',
            startDate: searchParams.get('startDate') || '',
            endDate: searchParams.get('endDate') || '',
            minAmount: searchParams.get('minAmount') || '',
            maxAmount: searchParams.get('maxAmount') || '',
            userStatus: searchParams.get('userStatus') || '',
            search: searchParams.get('search') || '',
        };
    }, [searchParams]);

    const [filters, setFilters] = useState(getFiltersFromURL);

    const [dateRange, setDateRange] = useState({
        startDate: '',
        endDate: '',
    });

    const [sendReportData, setSendReportData] = useState({
        email: '',
        startDate: '',
        endDate: '',
    });

    const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
    const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
    const [villages, setVillages] = useState<Array<{ id: string; name: string }>>([]);
    const filtersInitializedRef = useRef(false);

    // Update filters when URL changes (only on mount or when URL changes externally)
    useEffect(() => {
        const urlFilters = getFiltersFromURL();
        setFilters(urlFilters);
        filtersInitializedRef.current = true;
    }, [searchParams]);

    // Update URL when filters change (but not on initial load from URL)
    const updateURL = useCallback((newFilters: typeof filters) => {
        if (!filtersInitializedRef.current) return;

        const params = new URLSearchParams();
        if (newFilters.status.length > 0) params.set('status', newFilters.status.join(','));
        if (newFilters.category) params.set('category', newFilters.category);
        if (newFilters.salesId) params.set('salesId', newFilters.salesId);
        if (newFilters.packageId) params.set('packageId', newFilters.packageId);
        if (newFilters.provinceId) params.set('provinceId', newFilters.provinceId);
        if (newFilters.cityId) params.set('cityId', newFilters.cityId);
        if (newFilters.districtId) params.set('districtId', newFilters.districtId);
        if (newFilters.villageId) params.set('villageId', newFilters.villageId);
        if (newFilters.collectionStatus) params.set('collectionStatus', newFilters.collectionStatus);
        if (newFilters.agingBucket) params.set('agingBucket', newFilters.agingBucket);
        if (newFilters.startDate) params.set('startDate', newFilters.startDate);
        if (newFilters.endDate) params.set('endDate', newFilters.endDate);
        if (newFilters.minAmount) params.set('minAmount', newFilters.minAmount);
        if (newFilters.maxAmount) params.set('maxAmount', newFilters.maxAmount);
        if (newFilters.userStatus) params.set('userStatus', newFilters.userStatus);
        if (newFilters.search) params.set('search', newFilters.search);

        const newURL = params.toString() ? `/admin/billing/receivables?${params.toString()}` : '/admin/billing/receivables';
        const currentURL = window.location.pathname + window.location.search;
        if (newURL !== currentURL) {
            router.push(newURL, { scroll: false });
        }
    }, [router]);

    // Get current URL with query parameters for "Kembali" link
    const getCurrentURLWithParams = useCallback(() => {
        const params = new URLSearchParams();
        if (filters.status.length > 0) params.set('status', filters.status.join(','));
        if (filters.category) params.set('category', filters.category);
        if (filters.salesId) params.set('salesId', filters.salesId);
        if (filters.packageId) params.set('packageId', filters.packageId);
        if (filters.provinceId) params.set('provinceId', filters.provinceId);
        if (filters.cityId) params.set('cityId', filters.cityId);
        if (filters.districtId) params.set('districtId', filters.districtId);
        if (filters.villageId) params.set('villageId', filters.villageId);
        if (filters.collectionStatus) params.set('collectionStatus', filters.collectionStatus);
        if (filters.agingBucket) params.set('agingBucket', filters.agingBucket);
        if (filters.startDate) params.set('startDate', filters.startDate);
        if (filters.endDate) params.set('endDate', filters.endDate);
        if (filters.minAmount) params.set('minAmount', filters.minAmount);
        if (filters.maxAmount) params.set('maxAmount', filters.maxAmount);
        if (filters.userStatus) params.set('userStatus', filters.userStatus);
        if (filters.search) params.set('search', filters.search);

        return params.toString() ? `/admin/billing/receivables?${params.toString()}` : '/admin/billing/receivables';
    }, [filters]);

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

    const loadReceivables = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.status.length > 0) params.append('status', filters.status.join(','));
            if (filters.category) params.append('category', filters.category);
            if (filters.salesId) params.append('salesId', filters.salesId);
            if (filters.packageId) params.append('packageId', filters.packageId);
            if (filters.provinceId) params.append('provinceId', filters.provinceId);
            if (filters.cityId) params.append('cityId', filters.cityId);
            if (filters.districtId) params.append('districtId', filters.districtId);
            if (filters.villageId) params.append('villageId', filters.villageId);
            if (filters.collectionStatus) params.append('collectionStatus', filters.collectionStatus);
            if (filters.agingBucket) params.append('agingBucket', filters.agingBucket);
            if (filters.startDate) params.append('startDate', filters.startDate);
            if (filters.endDate) params.append('endDate', filters.endDate);
            if (filters.minAmount) params.append('minAmount', filters.minAmount);
            if (filters.maxAmount) params.append('maxAmount', filters.maxAmount);
            if (filters.userStatus) params.append('userStatus', filters.userStatus);
            if (filters.search) params.append('search', filters.search);

            const response = await fetch(`/api/admin/billing/receivables?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setData(result.data);
            }
        } catch (error) {
            console.error('Error loading receivables:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Load receivables data
    useEffect(() => {
        loadReceivables();
    }, [loadReceivables]);

    const loadCustomerData = async (userId: string) => {
        try {
            const response = await fetch(`/api/admin/billing/receivables/customer/${userId}`);
            const result = await response.json();
            if (result.success) {
                setCustomerData(result.data);
            }
        } catch (error) {
            console.error('Error loading customer data:', error);
        }
    };

    useEffect(() => {
        if (selectedCustomer) {
            loadCustomerData(selectedCustomer);
        }
    }, [selectedCustomer]);

    // Debounced URL update untuk search
    useEffect(() => {
        const timer = setTimeout(() => {
            updateURL(filters);
        }, filters.search ? 500 : 0);
        return () => clearTimeout(timer);
    }, [filters, updateURL]);

    const handleApplyFilters = () => {
        updateURL(filters);
        loadReceivables();
    };

    const handleResetFilters = () => {
        const resetFilters: typeof filters = {
            status: [],
            category: '',
            salesId: '',
            packageId: '',
            provinceId: '',
            cityId: '',
            districtId: '',
            villageId: '',
            collectionStatus: '',
            agingBucket: '',
            startDate: '',
            endDate: '',
            minAmount: '',
            maxAmount: '',
            userStatus: '',
            search: '',
        };
        setFilters(resetFilters);
        updateURL(resetFilters);
        setCities([]);
        setDistricts([]);
        setVillages([]);
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        params.append('format', 'csv');
        if (filters.status.length > 0) params.append('status', filters.status.join(','));
        if (filters.category) params.append('category', filters.category);
        if (filters.salesId) params.append('salesId', filters.salesId);
        if (filters.provinceId) params.append('provinceId', filters.provinceId);
        if (filters.cityId) params.append('cityId', filters.cityId);
        if (filters.districtId) params.append('districtId', filters.districtId);
        if (filters.villageId) params.append('villageId', filters.villageId);
        if (filters.collectionStatus) params.append('collectionStatus', filters.collectionStatus);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        window.open(`/api/admin/billing/receivables/export?${params.toString()}`, '_blank');
    };

    const handleSendReport = async () => {
        if (!sendReportData.email) {
            alert('Mohon masukkan email');
            return;
        }

        try {
            const response = await fetch('/api/admin/billing/receivables/send-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: sendReportData.email,
                    startDate: sendReportData.startDate || filters.startDate,
                    endDate: sendReportData.endDate || filters.endDate,
                    filters: {
                        status: filters.status.length > 0 ? filters.status : undefined,
                        category: filters.category || undefined,
                        salesId: filters.salesId || undefined,
                        provinceId: filters.provinceId || undefined,
                        cityId: filters.cityId || undefined,
                        collectionStatus: filters.collectionStatus || undefined,
                    },
                }),
            });

            const result = await response.json();
            if (result.success) {
                alert(`Laporan berhasil dikirim ke ${sendReportData.email}`);
                setShowSendReport(false);
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
    };

    const handleUpdateCollectionStatus = async (invoiceId: string, status: CollectionStatus, notes?: string) => {
        try {
            const response = await fetch(`/api/admin/billing/receivables/${invoiceId}/collection-status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    collectionStatus: status,
                    collectionNotes: notes,
                }),
            });

            const result = await response.json();
            if (result.success) {
                loadReceivables();
                if (selectedCustomer) {
                    loadCustomerData(selectedCustomer);
                }
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        }
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

    const getAgingColor = (bucket: string) => {
        if (bucket === '0-7') return 'text-green-600 bg-green-50';
        if (bucket === '8-15') return 'text-yellow-600 bg-yellow-50';
        if (bucket === '16-30') return 'text-orange-600 bg-orange-50';
        if (bucket === '31-60') return 'text-red-600 bg-red-50';
        if (bucket === '61-90') return 'text-red-700 bg-red-100';
        return 'text-red-900 bg-red-200';
    };

    const getStatusColor = (status: string) => {
        if (status === 'UNPAID') return 'text-blue-600 bg-blue-50';
        if (status === 'OVERDUE') return 'text-red-600 bg-red-50';
        if (status === 'EXPIRED') return 'text-orange-600 bg-orange-50';
        return 'text-gray-600 bg-gray-50';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <DollarSign className="w-6 h-6" />
                        Buku Piutang Pelanggan
                    </h2>
                    <p className="text-gray-600 mt-1">Manajemen dan tracking piutang pelanggan</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowDateRange(!showDateRange)}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Calendar className="w-4 h-4 mr-2" />
                        Range Tanggal
                    </button>
                    <button
                        onClick={() => setShowSendReport(true)}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Kirim Laporan
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${showFilters
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                            }`}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </button>
                    {data && (
                        <button
                            onClick={handleExport}
                            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Export
                        </button>
                    )}
                    <Link
                        href="/admin/billing"
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        Kembali ke Billing
                    </Link>
                </div>
            </div>

            {/* Date Range Panel */}
            {showDateRange && (
                <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Range Tanggal (Due Date)
                        </h3>
                        <button
                            onClick={() => setShowDateRange(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
                            <input
                                type="date"
                                value={filters.startDate}
                                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir</label>
                            <input
                                type="date"
                                value={filters.endDate}
                                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleApplyFilters}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Terapkan
                        </button>
                        <button
                            onClick={() => {
                                setFilters({ ...filters, startDate: '', endDate: '' });
                                setShowDateRange(false);
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            )}

            {/* Send Report Modal */}
            {showSendReport && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold">Kirim Laporan via Email</h3>
                            <button
                                onClick={() => setShowSendReport(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
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
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai (opsional)</label>
                                <input
                                    type="date"
                                    value={sendReportData.startDate}
                                    onChange={(e) => setSendReportData({ ...sendReportData, startDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Akhir (opsional)</label>
                                <input
                                    type="date"
                                    value={sendReportData.endDate}
                                    onChange={(e) => setSendReportData({ ...sendReportData, endDate: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSendReport}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                                >
                                    Kirim Laporan
                                </button>
                                <button
                                    onClick={() => setShowSendReport(false)}
                                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                >
                                    Batal
                                </button>
                            </div>
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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <div className="space-y-1">
                                {['UNPAID', 'OVERDUE', 'EXPIRED'].map((status) => (
                                    <label key={status} className="flex items-center">
                                        <input
                                            type="checkbox"
                                            checked={filters.status.includes(status)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setFilters({ ...filters, status: [...filters.status, status] });
                                                } else {
                                                    setFilters({ ...filters, status: filters.status.filter(s => s !== status) });
                                                }
                                            }}
                                            className="mr-2"
                                        />
                                        <span className="text-sm">{status}</span>
                                    </label>
                                ))}
                            </div>
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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Collection Status</label>
                            <select
                                value={filters.collectionStatus}
                                onChange={(e) => setFilters({ ...filters, collectionStatus: e.target.value as CollectionStatus | '' })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Semua Status</option>
                                {Object.entries(COLLECTION_STATUS_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Aging Bucket</label>
                            <select
                                value={filters.agingBucket}
                                onChange={(e) => setFilters({ ...filters, agingBucket: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Semua Bucket</option>
                                <option value="0-7">0-7 hari</option>
                                <option value="8-15">8-15 hari</option>
                                <option value="16-30">16-30 hari</option>
                                <option value="31-60">31-60 hari</option>
                                <option value="61-90">61-90 hari</option>
                                <option value=">90">&gt;90 hari</option>
                            </select>
                        </div>

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
                            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                            <input
                                type="text"
                                value={filters.search}
                                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                                placeholder="Invoice, nama, phone..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={handleApplyFilters}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                            Terapkan
                        </button>
                        <button
                            onClick={handleResetFilters}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                <div className="flex gap-2 border-b border-gray-200">
                    {[
                        { id: 'overview', label: 'Overview', icon: DollarSign },
                        { id: 'list', label: 'Daftar Piutang', icon: FileText },
                        { id: 'aging', label: 'Aging Analysis', icon: Clock },
                        { id: 'customer', label: 'Per Pelanggan', icon: Users },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id as any);
                                if (tab.id === 'customer') {
                                    setSelectedCustomer(null);
                                    setCustomerData(null);
                                }
                            }}
                            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p className="mt-4 text-gray-600">Memuat data piutang...</p>
                </div>
            ) : data ? (
                <>
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="bg-white/20 p-3 rounded-lg">
                                            <DollarSign className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="text-sm opacity-90 mb-1">Total Piutang</div>
                                    <div className="text-3xl font-bold mb-2">{formatCurrency(data.summary.totalReceivable)}</div>
                                    <div className="text-xs opacity-75">{data.summary.invoiceCount} invoice</div>
                                </div>

                                <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="bg-white/20 p-3 rounded-lg">
                                            <CheckCircle className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="text-sm opacity-90 mb-1">Piutang Lancar</div>
                                    <div className="text-3xl font-bold mb-2">{formatCurrency(data.summary.currentReceivable)}</div>
                                    <div className="text-xs opacity-75">Belum jatuh tempo</div>
                                </div>

                                <div className="bg-gradient-to-br from-red-500 to-red-600 p-6 rounded-xl shadow-lg text-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="bg-white/20 p-3 rounded-lg">
                                            <AlertCircle className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="text-sm opacity-90 mb-1">Piutang Terlambat</div>
                                    <div className="text-3xl font-bold mb-2">{formatCurrency(data.summary.overdueReceivable)}</div>
                                    <div className="text-xs opacity-75">Sudah jatuh tempo</div>
                                </div>

                                <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="bg-white/20 p-3 rounded-lg">
                                            <Users className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="text-sm opacity-90 mb-1">Pelanggan Berpiutang</div>
                                    <div className="text-3xl font-bold mb-2">{data.summary.customerCount}</div>
                                    <div className="text-xs opacity-75">Rata-rata {formatCurrency(data.summary.averageReceivable)}</div>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Aging Bucket Chart */}
                                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribusi Aging Bucket</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <BarChart data={Object.entries(data.agingBuckets).map(([bucket, data]) => ({
                                            name: `${bucket} hari`,
                                            count: data.count,
                                            amount: Number(data.amount),
                                        }))}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis dataKey="name" stroke="#6b7280" />
                                            <YAxis stroke="#6b7280" />
                                            <Tooltip
                                                formatter={(value: number, name: string) => [
                                                    name === 'count' ? `${value} invoice` : formatCurrency(value),
                                                    name === 'count' ? 'Jumlah' : 'Total Piutang',
                                                ]}
                                            />
                                            <Bar dataKey="count" fill="#3b82f6" name="Jumlah Invoice" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Category Breakdown */}
                                {Object.keys(data.categoryBreakdown).length > 0 && (
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Breakdown per Kategori</h3>
                                        <ResponsiveContainer width="100%" height={300}>
                                            <PieChart>
                                                <Pie
                                                    data={Object.entries(data.categoryBreakdown).map(([key, value]) => ({
                                                        name: CATEGORY_LABELS[key] || key,
                                                        value: value.amount,
                                                    }))}
                                                    cx="50%"
                                                    cy="50%"
                                                    labelLine={false}
                                                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                                    outerRadius={100}
                                                    fill="#8884d8"
                                                    dataKey="value"
                                                >
                                                    {Object.keys(data.categoryBreakdown).map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'list' && (
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Daftar Piutang</h3>
                                <span className="text-sm text-gray-500">{data.invoices.length} invoice</span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Due Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Umur</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pelanggan</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Sales</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Kategori</th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Jumlah</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Collection</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {data.invoices.map((inv) => (
                                            <tr key={inv.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {inv.invoiceNumber || `#${inv.id.slice(-6).toUpperCase()}`}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {formatDate(inv.dueDate)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getAgingColor(inv.agingBucket)}`}>
                                                        {inv.aging} hari
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="font-medium text-gray-900">{inv.user.name}</div>
                                                    <div className="text-gray-500">{inv.user.phone}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {inv.user.sales?.name || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {CATEGORY_LABELS[inv.category] || inv.category}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                    {formatCurrency(inv.amount)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(inv.status)}`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                                        {inv.collectionStatus ? COLLECTION_STATUS_LABELS[inv.collectionStatus] : 'Belum Ditagih'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => setSelectedCustomer(inv.user.id)}
                                                            className="p-1 text-indigo-600 hover:text-indigo-800"
                                                            title="Lihat Detail Pelanggan"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </button>
                                                        <a
                                                            href={`https://wa.me/${inv.user.phone.replace(/[^0-9]/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 text-green-600 hover:text-green-800"
                                                            title="Hubungi via WhatsApp"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </a>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'aging' && (
                        <div className="space-y-6">
                            {/* Aging Bucket Summary */}
                            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Aging Analysis</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aging Bucket</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Jumlah Invoice</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total Piutang</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">% dari Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {Object.entries(data.agingBuckets).map(([bucket, bucketData]) => {
                                                const percentage: number = data.summary.totalReceivable > 0
                                                    ? (bucketData.amount / data.summary.totalReceivable) * 100
                                                    : 0;
                                                return (
                                                    <tr key={bucket} className="hover:bg-gray-50">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-3 py-1 rounded text-sm font-medium ${getAgingColor(bucket)}`}>
                                                                {bucket} hari
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                                            {bucketData.count}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                                            {formatCurrency(bucketData.amount)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                                            {percentage.toFixed(1)}%
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Invoices by Aging Bucket */}
                            {Object.entries(data.agingBuckets).map(([bucket, bucketData]) => {
                                if (bucketData.count === 0) return null;
                                const bucketInvoices = data.invoices.filter(inv => inv.agingBucket === bucket);
                                return (
                                    <div key={bucket} className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                            <span className={`px-3 py-1 rounded text-sm font-medium ${getAgingColor(bucket)}`}>
                                                {bucket} hari ({bucketData.count} invoice)
                                            </span>
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pelanggan</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Due Date</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Jumlah</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {bucketInvoices.slice(0, 10).map((inv) => (
                                                        <tr key={inv.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                {inv.invoiceNumber || `#${inv.id.slice(-6).toUpperCase()}`}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <div className="font-medium text-gray-900">{inv.user.name}</div>
                                                                <div className="text-gray-500">{inv.user.phone}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {formatDate(inv.dueDate)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                                {formatCurrency(inv.amount)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(inv.status)}`}>
                                                                    {inv.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            {bucketInvoices.length > 10 && (
                                                <p className="text-center text-sm text-gray-500 mt-4">
                                                    Menampilkan 10 dari {bucketInvoices.length} invoice
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {activeTab === 'customer' && (
                        <div className="space-y-6">
                            {!selectedCustomer ? (
                                <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Pilih Pelanggan</h3>
                                    <p className="text-gray-600 mb-4">Klik tombol "Lihat Detail" pada invoice di tab "Daftar Piutang" untuk melihat detail per pelanggan</p>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Pelanggan</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total Piutang</th>
                                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Jumlah Invoice</th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {Array.from(new Set(data.invoices.map(inv => inv.user.id))).map((userId) => {
                                                    const userInvoices = data.invoices.filter(inv => inv.user.id === userId);
                                                    const total = userInvoices.reduce((sum, inv) => sum + inv.amount, 0);
                                                    const user = userInvoices[0].user;
                                                    return (
                                                        <tr key={userId} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm">
                                                                <div className="font-medium text-gray-900">{user.name}</div>
                                                                <div className="text-gray-500">{user.phone}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                                {formatCurrency(total)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right text-gray-600">
                                                                {userInvoices.length}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <button
                                                                    onClick={() => setSelectedCustomer(userId)}
                                                                    className="px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                                                                >
                                                                    Lihat Detail
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ) : customerData ? (
                                <div className="space-y-6">
                                    {/* Customer Info */}
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-xl font-bold text-gray-900">{customerData.user.name}</h3>
                                                <p className="text-gray-600">{customerData.user.phone}</p>
                                                {customerData.user.email && (
                                                    <p className="text-gray-600">{customerData.user.email}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setSelectedCustomer(null);
                                                    setCustomerData(null);
                                                    // Pastikan URL tetap mempertahankan filter
                                                    const currentURL = getCurrentURLWithParams();
                                                    router.push(currentURL, { scroll: false });
                                                }}
                                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                                            >
                                                ← Kembali
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="bg-blue-50 p-4 rounded-lg">
                                                <div className="text-sm text-gray-600 mb-1">Total Piutang</div>
                                                <div className="text-2xl font-bold text-blue-600">
                                                    {formatCurrency(customerData.summary.totalReceivable)}
                                                </div>
                                            </div>
                                            <div className="bg-green-50 p-4 rounded-lg">
                                                <div className="text-sm text-gray-600 mb-1">Jumlah Invoice</div>
                                                <div className="text-2xl font-bold text-green-600">
                                                    {customerData.summary.invoiceCount}
                                                </div>
                                            </div>
                                            <div className="bg-orange-50 p-4 rounded-lg">
                                                <div className="text-sm text-gray-600 mb-1">Rata-rata Umur</div>
                                                <div className="text-2xl font-bold text-orange-600">
                                                    {customerData.summary.averageAging} hari
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Receivables List */}
                                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daftar Piutang</h3>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Due Date</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Umur</th>
                                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Jumlah</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Collection</th>
                                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Aksi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {customerData.receivables.map((inv: any) => (
                                                        <tr key={inv.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-sm text-gray-900">
                                                                {inv.invoiceNumber || `#${inv.id.slice(-6).toUpperCase()}`}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                                {formatDate(inv.dueDate)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getAgingColor(inv.agingBucket)}`}>
                                                                    {inv.aging} hari
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                                                                {formatCurrency(inv.amount)}
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(inv.status)}`}>
                                                                    {inv.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <select
                                                                    value={inv.collectionStatus || 'NOT_COLLECTED'}
                                                                    onChange={(e) => handleUpdateCollectionStatus(inv.id, e.target.value as CollectionStatus)}
                                                                    className="text-xs border border-gray-300 rounded px-2 py-1"
                                                                >
                                                                    {Object.entries(COLLECTION_STATUS_LABELS).map(([key, label]) => (
                                                                        <option key={key} value={key}>{label}</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm">
                                                                <a
                                                                    href={`https://wa.me/${customerData.user.phone.replace(/[^0-9]/g, '')}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1 text-green-600 hover:text-green-800"
                                                                >
                                                                    <MessageSquare className="w-4 h-4" />
                                                                </a>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    <p className="mt-4 text-gray-600">Memuat data pelanggan...</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            ) : (
                <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                    <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Tidak ada data piutang</p>
                </div>
            )}
        </div>
    );
}

export default function ReceivablesPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        }>
            <ReceivablesContent />
        </Suspense>
    );
}
