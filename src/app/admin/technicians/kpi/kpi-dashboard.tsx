'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle, Award, Loader2 } from 'lucide-react';

interface Technician {
    id: string;
    name: string;
    phone: string;
    email: string | null;
}

interface KPIMetrics {
    totalTasks: number;
    completedTasks: number;
    onTimeTasks: number;
    failedTasks: number;
    totalTimeSpent: number;
    averageTimeSpent: number;
    completionRate: number;
    onTimeRate: number;
    tasksPerDay: number;
    qualityScore: number;
}

interface KPIRecord {
    id: string;
    periodStart: string;
    periodEnd: string;
    periodType: string;
    totalTasks: number;
    completedTasks: number;
    onTimeTasks: number;
    failedTasks: number;
    completionRate: number;
    onTimeRate: number;
    qualityScore: number | null;
    technician: {
        id: string;
        name: string;
    };
}

interface KPIDashboardProps {
    technicians: Technician[];
}

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function KPIDashboard({ technicians }: KPIDashboardProps) {
    const [selectedTechnician, setSelectedTechnician] = useState<string>('ALL');
    const [periodType, setPeriodType] = useState<string>('MONTHLY');
    const [loading, setLoading] = useState(true);
    const [kpiData, setKpiData] = useState<KPIRecord[]>([]);
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => {
        loadKPIData();
    }, [selectedTechnician, periodType]);

    async function loadKPIData() {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (selectedTechnician !== 'ALL') {
                params.append('technicianId', selectedTechnician);
            }
            params.append('periodType', periodType);

            const res = await fetch(`/api/admin/technicians/kpi?${params}`);
            if (!res.ok) throw new Error('Failed to load KPI data');
            const data = await res.json();

            setKpiData(data.records || []);

            // Calculate summary
            if (data.records && data.records.length > 0) {
                const records = data.records;
                const totalTasks = records.reduce((sum: number, r: KPIRecord) => sum + r.totalTasks, 0);
                const completedTasks = records.reduce((sum: number, r: KPIRecord) => sum + r.completedTasks, 0);
                const onTimeTasks = records.reduce((sum: number, r: KPIRecord) => sum + r.onTimeTasks, 0);
                const avgCompletionRate = records.reduce((sum: number, r: KPIRecord) => sum + r.completionRate, 0) / records.length;
                const avgOnTimeRate = records.reduce((sum: number, r: KPIRecord) => sum + r.onTimeRate, 0) / records.length;
                const avgQualityScore = records
                    .filter((r: KPIRecord) => r.qualityScore !== null)
                    .reduce((sum: number, r: KPIRecord) => sum + (r.qualityScore || 0), 0) / 
                    records.filter((r: KPIRecord) => r.qualityScore !== null).length || 0;

                setSummary({
                    totalTasks,
                    completedTasks,
                    onTimeTasks,
                    avgCompletionRate,
                    avgOnTimeRate,
                    avgQualityScore,
                });
            }
        } catch (error) {
            console.error('Error loading KPI data:', error);
        } finally {
            setLoading(false);
        }
    }

    // Prepare chart data
    const completionRateData = kpiData.map(record => ({
        period: new Date(record.periodStart).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        completionRate: record.completionRate,
        onTimeRate: record.onTimeRate,
    }));

    const taskVolumeData = kpiData.map(record => ({
        period: new Date(record.periodStart).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        total: record.totalTasks,
        completed: record.completedTasks,
        failed: record.failedTasks,
    }));

    const qualityScoreData = kpiData
        .filter(r => r.qualityScore !== null)
        .map(record => ({
            period: new Date(record.periodStart).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
            qualityScore: record.qualityScore,
        }));

    // Technician comparison data
    const technicianComparison = kpiData.reduce((acc: any, record: KPIRecord) => {
        const techId = record.technician.id;
        if (!acc[techId]) {
            acc[techId] = {
                name: record.technician.name,
                totalTasks: 0,
                completedTasks: 0,
                completionRate: 0,
                qualityScore: 0,
                count: 0,
            };
        }
        acc[techId].totalTasks += record.totalTasks;
        acc[techId].completedTasks += record.completedTasks;
        acc[techId].completionRate += record.completionRate;
        if (record.qualityScore !== null) {
            acc[techId].qualityScore += record.qualityScore;
            acc[techId].count++;
        }
        return acc;
    }, {});

    const technicianData = Object.values(technicianComparison).map((tech: any) => ({
        name: tech.name,
        completionRate: tech.completionRate / (kpiData.filter(r => r.technician.id === tech.name).length || 1),
        qualityScore: tech.count > 0 ? tech.qualityScore / tech.count : 0,
    }));

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto" />
                    <p className="mt-2 text-gray-500">Memuat data KPI...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard KPI Teknisi</h1>
                    <p className="mt-1 text-sm text-gray-500">Monitor performa dan kinerja teknisi</p>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="bg-white rounded-lg shadow p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Teknisi
                            </label>
                            <select
                                value={selectedTechnician}
                                onChange={(e) => setSelectedTechnician(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="ALL">Semua Teknisi</option>
                                {technicians.map(tech => (
                                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Periode
                            </label>
                            <select
                                value={periodType}
                                onChange={(e) => setPeriodType(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="DAILY">Harian</option>
                                <option value="WEEKLY">Mingguan</option>
                                <option value="MONTHLY">Bulanan</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Completion Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {summary.avgCompletionRate.toFixed(1)}%
                                    </p>
                                </div>
                                <CheckCircle className="w-8 h-8 text-green-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">On-Time Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {summary.avgOnTimeRate.toFixed(1)}%
                                    </p>
                                </div>
                                <Clock className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Total Tasks</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {summary.totalTasks}
                                    </p>
                                </div>
                                <TrendingUp className="w-8 h-8 text-indigo-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Quality Score</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {summary.avgQualityScore.toFixed(1)}
                                    </p>
                                </div>
                                <Award className="w-8 h-8 text-yellow-500" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Completion Rate Trend */}
                    {completionRateData.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Completion Rate Trend
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={completionRateData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="completionRate" stroke="#4F46E5" name="Completion Rate %" />
                                    <Line type="monotone" dataKey="onTimeRate" stroke="#10B981" name="On-Time Rate %" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Task Volume */}
                    {taskVolumeData.length > 0 && (
                        <div className="bg-white rounded-lg shadow p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Task Volume
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={taskVolumeData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="period" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="total" fill="#4F46E5" name="Total" />
                                    <Bar dataKey="completed" fill="#10B981" name="Completed" />
                                    <Bar dataKey="failed" fill="#EF4444" name="Failed" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Technician Comparison */}
                {technicianData.length > 0 && selectedTechnician === 'ALL' && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Perbandingan Teknisi
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={technicianData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="completionRate" fill="#4F46E5" name="Completion Rate %" />
                                <Bar dataKey="qualityScore" fill="#F59E0B" name="Quality Score" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}

                {/* Quality Score Trend */}
                {qualityScoreData.length > 0 && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Quality Score Trend
                        </h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={qualityScoreData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="period" />
                                <YAxis domain={[0, 100]} />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="qualityScore" stroke="#F59E0B" name="Quality Score" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>
        </div>
    );
}

