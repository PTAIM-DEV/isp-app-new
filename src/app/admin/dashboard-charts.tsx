'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, UserCheck, Users, DollarSign, AlertTriangle, Ban, XCircle, TrendingDown, FileText } from 'lucide-react';
import { DashboardTimeFilter, TimeRange } from './dashboard-time-filter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";


interface ChartData {
    day: string;
    registrasi: number;
    aktivasi: number;
    revenue: number;
    overdue: number;
    blocked: number;
    terminated: number;
    invoices: number;
}

interface CumulativeData {
    day: string;
    registrasi: number;
    aktivasi: number;
    revenue: number; // Added
}

interface ChurnRateData {
    day: string;
    churnRate: number;
    terminated: number;
    activeAtStart: number;
}

interface InvoiceData {
    day: string;
    invoices: number;
}

interface DashboardChartsProps {
    initialCumulativeData: CumulativeData[];
    initialChartData: ChartData[];
    initialChurnRateData: ChurnRateData[];
    initialInvoiceData: InvoiceData[];
}

export function DashboardCharts({
    initialCumulativeData,
    initialChartData,
    initialChurnRateData,
    initialInvoiceData
}: DashboardChartsProps) {
    const [timeRange, setTimeRange] = useState<TimeRange>('1M');
    const [loading, setLoading] = useState(false);
    const [cumulativeData, setCumulativeData] = useState<CumulativeData[]>(initialCumulativeData);
    const [chartData, setChartData] = useState<ChartData[]>(initialChartData);
    const [churnRateData, setChurnRateData] = useState<ChurnRateData[]>(initialChurnRateData);
    const [invoiceData, setInvoiceData] = useState<InvoiceData[]>(initialInvoiceData);

    useEffect(() => {
        async function fetchChartData() {
            setLoading(true);
            try {
                const response = await fetch(`/api/admin/dashboard/chart-data?range=${timeRange}`);
                const result = await response.json();
                if (result.success) {
                    setCumulativeData(result.data.cumulativeData);
                    setChartData(result.data.chartData);
                    setChurnRateData(result.data.churnRateData);
                    setInvoiceData(result.data.invoiceData);
                }
            } catch (error) {
                console.error('Error fetching chart data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchChartData();
    }, [timeRange]);

    // Calculate interval for X-axis based on data length
    const getXAxisInterval = () => {
        const dataLength = chartData.length;
        if (dataLength <= 7) return 0; // Show all labels for 7 days or less
        if (dataLength <= 14) return 1; // Show every other label for 14 days
        if (dataLength <= 30) return 2; // Show every 3rd label for 30 days
        if (dataLength <= 90) return 4; // Show every 5th label for 90 days
        return Math.floor(dataLength / 20); // Show ~20 labels for longer ranges
    };

    const xAxisInterval = getXAxisInterval();

    return (
        <div className="space-y-6">
            <DashboardTimeFilter selectedRange={timeRange} onRangeChange={setTimeRange} />

            {loading && (
                <div className="text-center py-8 text-gray-500">Loading chart data...</div>
            )}

            {/* Total Revenue Growth Chart */}
            <Card className="border-l-4 border-green-500">
                <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                    <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                    <CardTitle className="text-base font-semibold">Pertumbuhan Total Revenue (Akumulatif)</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart data={cumulativeData}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="day"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                interval={xAxisInterval}
                            />
                            <YAxis
                                tickFormatter={(value) => {
                                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                                    if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                                    return value;
                                }}
                            />
                            <Tooltip
                                formatter={(value: number) => `Rp ${value.toLocaleString('id-ID')}`}
                            />
                            <Legend />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#16a34a"
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                name="Total Revenue Akumulatif"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Combined: Customer Growth (Registration & Activation) per Day */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <Users className="w-5 h-5 text-purple-600 mr-2" />
                        <CardTitle className="text-base font-semibold">Pertambahan Pelanggan per Hari (Registrasi & Aktivasi)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <LineChart data={cumulativeData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="day"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={xAxisInterval}
                                />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="registrasi"
                                    stroke="#3b82f6"
                                    strokeWidth={2}
                                    name="Total Registrasi"
                                    dot={{ r: 3 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="aktivasi"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    name="Total Aktivasi"
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Daily Registration vs Activation */}
                <Card>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <Users className="w-5 h-5 text-purple-600 mr-2" />
                        <CardTitle className="text-base font-semibold">Registrasi vs Aktivasi per Hari</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="day"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={xAxisInterval}
                                />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="registrasi" fill="#3b82f6" name="Registrasi" />
                                <Bar dataKey="aktivasi" fill="#10b981" name="Aktivasi" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Invoice Created per Day */}
                <Card>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <FileText className="w-5 h-5 text-blue-600 mr-2" />
                        <CardTitle className="text-base font-semibold">Invoice Dicetak per Hari</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={invoiceData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="day"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={xAxisInterval}
                                />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="invoices" fill="#2563eb" name="Invoice Dicetak" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Revenue per Day */}
                <Card>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <DollarSign className="w-5 h-5 text-yellow-600 mr-2" />
                        <CardTitle className="text-base font-semibold">Revenue per Hari</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="day"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={xAxisInterval}
                                />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: number) => `Rp ${(value * 1000).toLocaleString('id-ID')}`}
                                />
                                <Legend />
                                <Bar dataKey="revenue" fill="#f59e0b" name="Revenue (Ribuan)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Overdue, Blocked, Terminated per Day */}
                <Card>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mr-2" />
                        <CardTitle className="text-base font-semibold">Overdue, Blocked & Terminated per Hari</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="day"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={xAxisInterval}
                                />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="overdue" fill="#f97316" name="Overdue" />
                                <Bar dataKey="blocked" fill="#ef4444" name="Blocked" />
                                <Bar dataKey="terminated" fill="#6b7280" name="Terminated" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Churn Rate per Day */}
                <Card>
                    <CardHeader className="flex flex-row items-center space-y-0 pb-2">
                        <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
                        <CardTitle className="text-base font-semibold">Churn Rate per Hari (%)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={churnRateData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="day"
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={xAxisInterval}
                                />
                                <YAxis />
                                <Tooltip
                                    formatter={(value: number) => `${value.toFixed(2)}%`}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="churnRate"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    name="Churn Rate (%)"
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

