import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';

function calculateAging(dueDate: Date): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);

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

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, startDate, endDate, filters } = body;

        if (!email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        // Build where clause (same as receivables endpoint)
        const where: any = {
            status: { in: ['UNPAID', 'OVERDUE', 'EXPIRED'] },
            deletedAt: null,
            collectionStatus: { not: 'WRITE_OFF' },
        };

        // Apply date range
        if (startDate || endDate) {
            where.dueDate = {};
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                where.dueDate.gte = start;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.dueDate.lte = end;
            }
        }

        // Apply additional filters if provided
        if (filters) {
            if (filters.status && filters.status.length > 0) {
                where.status = { in: filters.status };
            }
            if (filters.category) {
                where.category = filters.category;
            }
            if (filters.collectionStatus) {
                where.collectionStatus = filters.collectionStatus;
            }

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

            if (Object.keys(userWhere).length > 0) {
                where.user = userWhere;
            }
        }

        // Fetch invoices
        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                user: {
                    include: {
                        salesPerson: {
                            select: {
                                name: true,
                            },
                        },
                        province: { select: { name: true } },
                        city: { select: { name: true } },
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });

        // Process invoices
        const processedInvoices = invoices.map((invoice) => {
            const aging = calculateAging(invoice.dueDate);
            const bucket = getAgingBucket(aging);

            return {
                invoiceNumber: invoice.invoiceNumber || `#${invoice.id.slice(-6).toUpperCase()}`,
                dueDate: invoice.dueDate,
                aging,
                agingBucket: bucket,
                customerName: invoice.user.name,
                customerPhone: invoice.user.phone,
                sales: invoice.user.salesPerson?.name || '-',
                location: [
                    invoice.user.province?.name,
                    invoice.user.city?.name,
                ].filter(Boolean).join(', '),
                category: invoice.category,
                amount: Number(invoice.amount),
                status: invoice.status,
            };
        });

        // Calculate summary
        const totalReceivable = processedInvoices.reduce(
            (sum, inv) => sum + inv.amount,
            0
        );

        const customerCount = new Set(processedInvoices.map((inv) => inv.customerName)).size;

        // Calculate aging buckets
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
                agingBuckets[bucket as keyof typeof agingBuckets].amount += inv.amount;
            }
        });

        // Generate HTML report
        const reportDate = new Date().toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });

        const dateRangeText = startDate && endDate
            ? `${formatDate(startDate)} - ${formatDate(endDate)}`
            : 'Semua Periode';

        const htmlReport = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
        }
        .header p {
            color: #6b7280;
            margin: 5px 0;
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
        }
        .summary-card .value {
            font-size: 24px;
            font-weight: bold;
            margin: 0;
        }
        .section {
            margin-bottom: 30px;
        }
        .section h2 {
            color: #4F46E5;
            border-bottom: 2px solid #e5e7eb;
            padding-bottom: 10px;
            margin-bottom: 15px;
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
        .status-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }
        .status-UNPAID { background-color: #dbeafe; color: #1e40af; }
        .status-OVERDUE { background-color: #fee2e2; color: #991b1b; }
        .status-EXPIRED { background-color: #fef3c7; color: #92400e; }
        .footer {
            text-align: center;
            color: #6b7280;
            font-size: 12px;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Laporan Buku Piutang</h1>
            <p>Periode: ${dateRangeText}</p>
            <p>Tanggal Laporan: ${reportDate}</p>
        </div>

        <div class="summary">
            <div class="summary-card">
                <h3>Total Piutang</h3>
                <p class="value">${formatCurrency(totalReceivable)}</p>
            </div>
            <div class="summary-card">
                <h3>Jumlah Invoice</h3>
                <p class="value">${processedInvoices.length}</p>
            </div>
            <div class="summary-card">
                <h3>Jumlah Pelanggan</h3>
                <p class="value">${customerCount}</p>
            </div>
        </div>

        <div class="section">
            <h2>Breakdown per Aging Bucket</h2>
            <table>
                <thead>
                    <tr>
                        <th>Aging Bucket</th>
                        <th>Jumlah Invoice</th>
                        <th>Total Piutang</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(agingBuckets).map(([bucket, data]) => `
                        <tr>
                            <td><strong>${bucket} hari</strong></td>
                            <td>${data.count}</td>
                            <td>${formatCurrency(data.amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="section">
            <h2>Detail Invoice</h2>
            <table>
                <thead>
                    <tr>
                        <th>Invoice</th>
                        <th>Due Date</th>
                        <th>Umur</th>
                        <th>Pelanggan</th>
                        <th>Sales</th>
                        <th>Kategori</th>
                        <th>Jumlah</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${processedInvoices.slice(0, 100).map((inv) => `
                        <tr>
                            <td>${inv.invoiceNumber}</td>
                            <td>${formatDate(inv.dueDate)}</td>
                            <td>${inv.aging} hari</td>
                            <td>${inv.customerName}<br><small>${inv.customerPhone}</small></td>
                            <td>${inv.sales}</td>
                            <td>${inv.category}</td>
                            <td><strong>${formatCurrency(inv.amount)}</strong></td>
                            <td><span class="status-badge status-${inv.status}">${inv.status}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${processedInvoices.length > 100 ? `<p style="text-align: center; color: #6b7280; margin-top: 15px;">Menampilkan 100 dari ${processedInvoices.length} invoice</p>` : ''}
        </div>

        <div class="footer">
            <p>Laporan ini dibuat otomatis dari sistem ISP Management</p>
            <p>Untuk pertanyaan, silakan hubungi administrator sistem</p>
        </div>
    </div>
</body>
</html>
        `;

        // Send email
        await sendEmail({
            to: email,
            subject: `Laporan Buku Piutang - ${dateRangeText}`,
            html: htmlReport,
        });

        return NextResponse.json({
            success: true,
            message: `Laporan berhasil dikirim ke ${email}`,
        });
    } catch (error: any) {
        console.error('Error sending receivables report:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

