import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { generateRevenuePDF } from '@/lib/revenue-pdf-generator';

type PeriodType = '1day' | 'yesterday' | '7days' | '1month' | '3months' | '6months' | 'ytd' | 'legacy';

function getPeriodDates(period: PeriodType): { start: Date; end: Date } {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const end = new Date(now);
    let start: Date;

    switch (period) {
        case '1day':
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
            break;
        case 'yesterday':
            start = new Date(now);
            start.setDate(start.getDate() - 1);
            start.setHours(0, 0, 0, 0);
            end.setDate(end.getDate() - 1);
            end.setHours(23, 59, 59, 999);
            break;
        case '7days':
            start = new Date(now);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            break;
        case '1month':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            break;
        case '3months':
            start = new Date(now);
            start.setMonth(start.getMonth() - 2);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        case '6months':
            start = new Date(now);
            start.setMonth(start.getMonth() - 5);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        case 'ytd':
            start = new Date(now.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);
            break;
        default:
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
    }

    return { start, end };
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

const CATEGORY_LABELS: Record<string, string> = {
    INSTALLATION_FEE: 'Biaya Instalasi',
    FIRST_MONTH: 'Bulan Pertama',
    REGULAR_MONTHLY: 'Bulanan Reguler',
    PREPAID_3_MONTHS: 'Prepaid 3 Bulan',
    PREPAID_6_MONTHS: 'Prepaid 6 Bulan',
    PREPAID_12_MONTHS: 'Prepaid 12 Bulan',
    TRIAL_PERIOD: 'Trial Period',
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { email, phone, sendVia, period, startDate, endDate, filters } = body;

        if (!sendVia || (sendVia !== 'email' && sendVia !== 'whatsapp')) {
            return NextResponse.json(
                { success: false, error: 'sendVia harus email atau whatsapp' },
                { status: 400 }
            );
        }

        if (sendVia === 'email' && !email) {
            return NextResponse.json(
                { success: false, error: 'Email is required' },
                { status: 400 }
            );
        }

        if (sendVia === 'whatsapp' && !phone) {
            return NextResponse.json(
                { success: false, error: 'Phone number is required' },
                { status: 400 }
            );
        }

        // Determine date range
        let dateStart: Date;
        let dateEnd: Date;
        let periodLabel = 'Custom';

        if (startDate && endDate) {
            dateStart = new Date(startDate);
            dateStart.setHours(0, 0, 0, 0);
            dateEnd = new Date(endDate);
            dateEnd.setHours(23, 59, 59, 999);
            periodLabel = `${formatDate(dateStart)} - ${formatDate(dateEnd)}`;
        } else if (period) {
            const dates = getPeriodDates(period as PeriodType);
            dateStart = dates.start;
            dateEnd = dates.end;
            const periodLabels: Record<string, string> = {
                '1day': 'Hari Ini',
                'yesterday': 'Kemarin',
                '7days': '7 Hari Terakhir',
                '1month': 'Bulan Ini',
                '3months': '3 Bulan Terakhir',
                '6months': '6 Bulan Terakhir',
                'ytd': 'Tahun Ini (YTD)',
            };
            periodLabel = periodLabels[period] || period;
        } else {
            return NextResponse.json(
                { success: false, error: 'Period or date range is required' },
                { status: 400 }
            );
        }

        // Build where clause
        const whereClause: any = {
            deletedAt: null,
            status: 'PAID',
            paidAt: {
                not: null,
                gte: dateStart,
                lte: dateEnd,
            },
        };

        // Apply filters
        if (filters) {
            if (filters.category) {
                whereClause.category = filters.category;
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
                whereClause.user = userWhere;
            }
        }

        // Fetch invoices
        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            include: {
                user: {
                    include: {
                        salesPerson: {
                            select: { name: true },
                        },
                    },
                },
            },
            orderBy: { paidAt: 'desc' },
        });

        // Calculate summary
        const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const transactionCount = invoices.length;
        const averageTransaction = transactionCount > 0 ? totalRevenue / transactionCount : 0;

        // Category breakdown
        const categoryBreakdown: Record<string, { revenue: number; count: number }> = {};
        invoices.forEach((inv) => {
            const cat = inv.category;
            if (!categoryBreakdown[cat]) {
                categoryBreakdown[cat] = { revenue: 0, count: 0 };
            }
            categoryBreakdown[cat].revenue += Number(inv.amount);
            categoryBreakdown[cat].count++;
        });

        // Daily breakdown
        const dailyBreakdown: Record<string, number> = {};
        invoices.forEach((inv) => {
            if (inv.paidAt) {
                const dateKey = inv.paidAt.toISOString().split('T')[0];
                dailyBreakdown[dateKey] = (dailyBreakdown[dateKey] || 0) + Number(inv.amount);
            }
        });

        const sortedDailyBreakdown = Object.entries(dailyBreakdown)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, revenue]) => ({ date, revenue }));

        // Get overdue info
        const overdueWhereClause: any = {
            deletedAt: null,
            status: { in: ['OVERDUE', 'UNPAID'] },
            dueDate: { lte: dateEnd },
            OR: [
                { collectionStatus: null },
                { collectionStatus: { not: 'WRITE_OFF' } },
            ],
        };

        if (filters) {
            if (filters.category) {
                overdueWhereClause.category = filters.category;
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
                overdueWhereClause.user = userWhere;
            }
        }

        const overdueInvoices = await prisma.invoice.findMany({
            where: overdueWhereClause,
            select: {
                amount: true,
            },
        });

        const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const overdueCount = overdueInvoices.length;

        // Prepare data for PDF generation
        const revenueData = {
            periodLabel,
            dateRange: {
                start: dateStart.toISOString(),
                end: dateEnd.toISOString(),
            },
            summary: {
                totalRevenue,
                transactionCount,
                averageTransaction,
                overdueAmount,
                overdueCount,
            },
            categoryBreakdown,
            dailyBreakdown: sortedDailyBreakdown,
        };

        // Generate PDF
        console.log('[Revenue Report] Generating PDF...');
        const pdfBuffer = await generateRevenuePDF(revenueData);
        console.log('[Revenue Report] PDF generated successfully');

        if (sendVia === 'email') {
            // Send PDF via email as attachment
            const nodemailer = require('nodemailer');
            const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
            const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
            const SMTP_USER = process.env.SMTP_USER;
            const SMTP_PASS = process.env.SMTP_PASS;
            const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

            if (!SMTP_USER || !SMTP_PASS) {
                return NextResponse.json(
                    { success: false, error: 'SMTP not configured' },
                    { status: 500 }
                );
            }

            const transporter = nodemailer.createTransport({
                host: SMTP_HOST,
                port: SMTP_PORT,
                secure: SMTP_PORT === 465,
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
            });

            const fileName = `Laporan_Revenue_${periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

            await transporter.sendMail({
                from: `"ISP Management" <${SMTP_FROM}>`,
                to: email,
                subject: `Laporan Revenue PDF - ${periodLabel}`,
                html: `
                    <p>Halo,</p>
                    <p>Berikut adalah laporan revenue untuk periode <strong>${periodLabel}</strong>.</p>
                    <p>Laporan ini berisi:</p>
                    <ul>
                        <li>Total Revenue: ${formatCurrency(totalRevenue)}</li>
                        <li>Jumlah Transaksi: ${transactionCount}</li>
                        <li>Rata-rata per Transaksi: ${formatCurrency(averageTransaction)}</li>
                        ${overdueAmount > 0 ? `<li>Piutang Terlambat: ${formatCurrency(overdueAmount)} (${overdueCount} invoice)</li>` : ''}
                    </ul>
                    <p>Silakan lihat file PDF terlampir untuk detail lengkap termasuk chart.</p>
                    <p>Terima kasih.</p>
                `,
                attachments: [
                    {
                        filename: fileName,
                        content: pdfBuffer,
                        contentType: 'application/pdf',
                    },
                ],
            });

            return NextResponse.json({
                success: true,
                message: `Laporan PDF berhasil dikirim ke ${email}`,
            });
        } else if (sendVia === 'whatsapp') {
            // Send PDF via WhatsApp
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.startsWith('0')) {
                cleanPhone = '62' + cleanPhone.slice(1);
            } else if (!cleanPhone.startsWith('62')) {
                cleanPhone = '62' + cleanPhone;
            }
            const jid = `${cleanPhone}@s.whatsapp.net`;

            const fileName = `Laporan_Revenue_${periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

            // Save PDF to temporary file for WhatsApp worker
            const fs = require('fs');
            const path = require('path');
            const tempDir = path.join(process.cwd(), 'public', 'uploads', 'whatsapp', 'temp');

            // Ensure temp directory exists
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const tempFilePath = path.join(tempDir, fileName);
            fs.writeFileSync(tempFilePath, pdfBuffer);

            // Create WhatsApp message with PDF
            const message = `📊 *Laporan Revenue PDF*

Periode: ${periodLabel}

📈 *Ringkasan:*
• Total Revenue: ${formatCurrency(totalRevenue)}
• Jumlah Transaksi: ${transactionCount}
• Rata-rata per Transaksi: ${formatCurrency(averageTransaction)}
${overdueAmount > 0 ? `• Piutang Terlambat: ${formatCurrency(overdueAmount)} (${overdueCount} invoice)` : ''}

File PDF terlampir berisi detail lengkap termasuk chart visual.`;

            // Queue WhatsApp message with media path
            // Format: content will contain message, and we'll add mediaPath in a special format
            // Worker will parse this and send as document
            await prisma.whatsAppOutgoing.create({
                data: {
                    jid,
                    content: `${message}\n\n[MEDIA:document:${tempFilePath}:${fileName}]`,
                    status: 'PENDING',
                },
            });

            return NextResponse.json({
                success: true,
                message: `Laporan PDF berhasil di-queue untuk dikirim ke WhatsApp ${phone}`,
                note: 'PDF akan dikirim sebagai dokumen melalui WhatsApp.',
            });
        }
    } catch (error: any) {
        console.error('Error sending revenue report:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

