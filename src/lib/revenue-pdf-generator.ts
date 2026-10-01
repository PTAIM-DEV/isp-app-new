import { generatePDFFromHTML } from './pdf-generator';

interface RevenueData {
    periodLabel: string;
    dateRange: {
        start: string;
        end: string;
    };
    summary: {
        totalRevenue: number;
        transactionCount: number;
        averageTransaction: number;
        overdueAmount?: number;
        overdueCount?: number;
    };
    categoryBreakdown: Record<string, { revenue: number; count: number }>;
    dailyBreakdown: Array<{ date: string; revenue: number }>;
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

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

/**
 * Generate HTML with Chart.js for revenue report
 */
function generateRevenueReportHTML(data: RevenueData): string {
    const reportDate = new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    // Prepare chart data
    const dailyLabels = data.dailyBreakdown.map(d => {
        const date = new Date(d.date);
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });
    const dailyRevenue = data.dailyBreakdown.map(d => d.revenue);

    const categoryLabels = Object.keys(data.categoryBreakdown).map(key => CATEGORY_LABELS[key] || key);
    const categoryRevenue = Object.values(data.categoryBreakdown).map(cat => cat.revenue);

    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #4F46E5;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #6b7280;
            margin: 5px 0;
            font-size: 14px;
        }
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 30px;
        }
        .summary-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            text-align: center;
        }
        .summary-card h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            opacity: 0.9;
            font-weight: normal;
        }
        .summary-card .value {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
        }
        .summary-card.warning {
            background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
        }
        .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
        }
        .section h2 {
            color: #4F46E5;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-size: 20px;
        }
        .chart-container {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            height: 400px;
            position: relative;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        th {
            background-color: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        tr:hover {
            background-color: #f9fafb;
        }
        .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        @media print {
            body {
                padding: 0;
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Laporan Revenue</h1>
            <p>Periode: ${data.periodLabel}</p>
            <p>Tanggal Laporan: ${reportDate}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Revenue</h3>
                <p class="value">${formatCurrency(data.summary.totalRevenue)}</p>
            </div>
            <div class="summary-card">
                <h3>Jumlah Transaksi</h3>
                <p class="value">${data.summary.transactionCount}</p>
            </div>
            <div class="summary-card">
                <h3>Rata-rata per Transaksi</h3>
                <p class="value">${formatCurrency(data.summary.averageTransaction)}</p>
            </div>
            ${data.summary.overdueAmount !== undefined ? `
            <div class="summary-card warning">
                <h3>Piutang Terlambat</h3>
                <p class="value">${formatCurrency(data.summary.overdueAmount)}</p>
                <p style="font-size: 12px; margin-top: 5px;">${data.summary.overdueCount || 0} invoice</p>
            </div>
            ` : ''}
        </div>

        <div class="section">
            <h2>Revenue per Hari</h2>
            <div class="chart-container">
                <canvas id="dailyChart"></canvas>
            </div>
        </div>

        <div class="section">
            <h2>Breakdown per Kategori</h2>
            <div class="chart-container">
                <canvas id="categoryChart"></canvas>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Kategori</th>
                        <th>Jumlah Transaksi</th>
                        <th>Total Revenue</th>
                        <th>Rata-rata</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(data.categoryBreakdown).map(([key, catData]) => `
                        <tr>
                            <td><strong>${CATEGORY_LABELS[key] || key}</strong></td>
                            <td>${catData.count}</td>
                            <td>${formatCurrency(catData.revenue)}</td>
                            <td>${formatCurrency(catData.revenue / catData.count)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Laporan ini dibuat otomatis dari sistem ISP Management</p>
            <p>Untuk pertanyaan, silakan hubungi administrator sistem</p>
        </div>
    </div>

    <script>
        // Wait for Chart.js to load
        window.addEventListener('load', function() {
            // Daily Revenue Chart
            const dailyCtx = document.getElementById('dailyChart');
            if (dailyCtx) {
                new Chart(dailyCtx, {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(dailyLabels)},
                        datasets: [{
                            label: 'Revenue',
                            data: ${JSON.stringify(dailyRevenue)},
                            backgroundColor: 'rgba(79, 70, 229, 0.8)',
                            borderColor: 'rgba(79, 70, 229, 1)',
                            borderWidth: 1
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return 'Revenue: ' + new Intl.NumberFormat('id-ID', {
                                            style: 'currency',
                                            currency: 'IDR',
                                            minimumFractionDigits: 0
                                        }).format(context.parsed.y);
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return new Intl.NumberFormat('id-ID', {
                                            style: 'currency',
                                            currency: 'IDR',
                                            minimumFractionDigits: 0,
                                            notation: 'compact'
                                        }).format(value);
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // Category Breakdown Chart
            const categoryCtx = document.getElementById('categoryChart');
            if (categoryCtx) {
                new Chart(categoryCtx, {
                    type: 'pie',
                    data: {
                        labels: ${JSON.stringify(categoryLabels)},
                        datasets: [{
                            data: ${JSON.stringify(categoryRevenue)},
                            backgroundColor: [
                                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
                                '#8b5cf6', '#ec4899', '#06b6d4'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right'
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const label = context.label || '';
                                        const value = context.parsed || 0;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return label + ': ' + new Intl.NumberFormat('id-ID', {
                                            style: 'currency',
                                            currency: 'IDR',
                                            minimumFractionDigits: 0
                                        }).format(value) + ' (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
    </script>
</body>
</html>
    `;

    return html;
}

/**
 * Generate PDF for revenue report
 */
export async function generateRevenuePDF(data: RevenueData): Promise<Buffer> {
    const html = generateRevenueReportHTML(data);
    return await generatePDFFromHTML(html);
}

