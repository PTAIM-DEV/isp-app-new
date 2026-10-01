'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, CheckCircle, Award, Loader2, ArrowLeft } from 'lucide-react';

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
}

interface TechnicianKPIClientProps {
    technician: Technician;
}

export function TechnicianKPIClient({ technician }: TechnicianKPIClientProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [currentMetrics, setCurrentMetrics] = useState<KPIMetrics | null>(null);
    const [historicalRecords, setHistoricalRecords] = useState<KPIRecord[]>([]);
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => {
        loadKPIData();
    }, []);

    async function loadKPIData() {
        setLoading(true);
        try {
            const res = await fetch('/api/technician/kpi?months=3');
            if (!res.ok) throw new Error('Failed to load KPI data');
            const data = await res.json();

            setCurrentMetrics(data.currentMetrics);
            setHistoricalRecords(data.historicalRecords || []);
            setSummary(data.summary);
        } catch (error) {
            console.error('Error loading KPI data:', error);
        } finally {
            setLoading(false);
        }
    }

    // Prepare chart data
    const completionRateData = historicalRecords.map(record => ({
        period: new Date(record.periodStart).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
        completionRate: record.completionRate,
        onTimeRate: record.onTimeRate,
    }));

    const qualityScoreData = historicalRecords
        .filter(r => r.qualityScore !== null)
        .map(record => ({
            period: new Date(record.periodStart).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }),
            qualityScore: record.qualityScore,
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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={() => router.back()}
                        className="text-indigo-600 hover:text-indigo-800 mb-4 flex items-center"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Kembali
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">KPI & Performa Saya</h1>
                    <p className="mt-1 text-sm text-gray-500">Monitor performa dan kinerja Anda</p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Summary Cards */}
                {currentMetrics && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-500">Completion Rate</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {currentMetrics.completionRate.toFixed(1)}%
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
                                        {currentMetrics.onTimeRate.toFixed(1)}%
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
                                        {currentMetrics.totalTasks}
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
                                        {currentMetrics.qualityScore.toFixed(1)}
                                    </p>
                                </div>
                                <Award className="w-8 h-8 text-yellow-500" />
                            </div>
                        </div>
                    </div>
                )}

                {/* Detailed Stats */}
                {currentMetrics && (
                    <div className="bg-white rounded-lg shadow p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detail Statistik</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Completed Tasks</p>
                                <p className="text-xl font-bold text-gray-900">{currentMetrics.completedTasks}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">On-Time Tasks</p>
                                <p className="text-xl font-bold text-gray-900">{currentMetrics.onTimeTasks}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Failed Tasks</p>
                                <p className="text-xl font-bold text-red-600">{currentMetrics.failedTasks}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Avg Time/Task</p>
                                <p className="text-xl font-bold text-gray-900">{currentMetrics.averageTimeSpent.toFixed(0)} min</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        </div>
    );
}

