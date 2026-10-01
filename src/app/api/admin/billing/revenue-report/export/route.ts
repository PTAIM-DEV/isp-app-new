import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type PeriodType = '1day' | 'yesterday' | '7days' | '1month' | '3months' | '6months' | 'ytd' | 'legacy';

function getPeriodDates(period: PeriodType): { start: Date; end: Date } {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    if (period === 'yesterday') {
        const start = new Date(now);
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
    }

    let start: Date;
    const end = new Date(now);

    switch (period) {
        case '1day': {
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
            break;
        }
        case '7days': {
            start = new Date(now);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            break;
        }
        case '1month': {
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            start.setHours(0, 0, 0, 0);
            break;
        }
        case '3months': {
            start = new Date(now);
            start.setMonth(start.getMonth() - 2);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        }
        case '6months': {
            start = new Date(now);
            start.setMonth(start.getMonth() - 5);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            break;
        }
        case 'ytd': {
            start = new Date(now.getFullYear(), 0, 1);
            start.setHours(0, 0, 0, 0);
            break;
        }
        default: {
            start = new Date(now);
            start.setHours(0, 0, 0, 0);
            break;
        }
    }

    return { start, end };
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const period = (searchParams.get('period') || '1day') as PeriodType;
        const salesId = searchParams.get('salesId') || undefined;
        const packageId = searchParams.get('packageId') || undefined;
        const provinceId = searchParams.get('provinceId') || undefined;
        const cityId = searchParams.get('cityId') || undefined;
        const districtId = searchParams.get('districtId') || undefined;
        const villageId = searchParams.get('villageId') || undefined;
        const category = searchParams.get('category') || undefined;
        const customStartDate = searchParams.get('startDate') || undefined;
        const customEndDate = searchParams.get('endDate') || undefined;

        // Handle legacy payments export
        if (period === 'legacy') {
            const legacyWhere: any = {
                invoiceId: null,
                status: 'PAID',
                paidAt: { not: null },
            };

            const userWhere: any = {};
            if (provinceId) userWhere.provinceId = provinceId;
            if (cityId) userWhere.cityId = cityId;
            if (districtId) userWhere.districtId = districtId;
            if (villageId) userWhere.villageId = villageId;
            if (salesId) userWhere.salesPersonId = salesId;

            if (Object.keys(userWhere).length > 0) {
                legacyWhere.user = userWhere;
            }

            const legacyTransactions = await prisma.paymentTransaction.findMany({
                where: legacyWhere,
                include: {
                    user: {
                        include: {
                            salesPerson: true,
                            province: true,
                            city: true,
                            district: true,
                            village: true,
                        },
                    },
                },
                orderBy: {
                    paidAt: 'desc',
                },
            });

            // Generate CSV
            const headers = [
                'Tanggal Pembayaran',
                'Jumlah',
                'Metode Pembayaran',
                'Channel',
                'Nama Pelanggan',
                'Telepon',
                'Email',
                'Sales',
                'Provinsi',
                'Kota',
                'Kecamatan',
                'Kelurahan',
                'Xendit ID',
                'External ID',
            ];

            const rows = legacyTransactions.map(tx => [
                tx.paidAt?.toLocaleDateString('id-ID') || '',
                Number(tx.amount).toLocaleString('id-ID'),
                tx.paymentMethod || '',
                tx.paymentChannel || '',
                tx.user?.name || '',
                tx.user?.phone || '',
                tx.user?.email || '',
                tx.user?.salesPerson?.name || '',
                tx.user?.province?.name || '',
                tx.user?.city?.name || '',
                tx.user?.district?.name || '',
                tx.user?.village?.name || '',
                tx.xenditId,
                tx.externalId || '',
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const BOM = '\uFEFF';
            const csvWithBOM = BOM + csvContent;

            return new NextResponse(csvWithBOM, {
                headers: {
                    'Content-Type': 'text/csv; charset=utf-8',
                    'Content-Disposition': `attachment; filename="revenue-report-legacy-${new Date().toISOString().split('T')[0]}.csv"`,
                },
            });
        }

        // Build where clause for filters
        const whereClause: any = {
            deletedAt: null,
            status: 'PAID',
            paidAt: { not: null },
        };

        // Date range
        let startDate: Date;
        let endDate: Date;

        if (customStartDate && customEndDate) {
            startDate = new Date(customStartDate);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(customEndDate);
            endDate.setHours(23, 59, 59, 999);
        } else {
            const dates = getPeriodDates(period);
            startDate = dates.start;
            endDate = dates.end;
        }

        whereClause.paidAt = {
            gte: startDate,
            lte: endDate,
        };

        // Category filter
        if (category) {
            whereClause.category = category;
        }

        // Location filters and package filter
        const userWhere: any = {};
        if (provinceId) userWhere.provinceId = provinceId;
        if (cityId) userWhere.cityId = cityId;
        if (districtId) userWhere.districtId = districtId;
        if (villageId) userWhere.villageId = villageId;
        if (salesId) userWhere.salesPersonId = salesId;

        // Package filter (through subscription)
        if (packageId) {
            // First get the package name
            const packageData = await prisma.servicePackage.findUnique({
                where: { id: packageId },
                select: { name: true },
            });

            if (packageData) {
                userWhere.subscription = {
                    planName: packageData.name,
                };
            }
        }

        if (Object.keys(userWhere).length > 0) {
            whereClause.user = userWhere;
        }

        // Get invoices
        const invoices = await prisma.invoice.findMany({
            where: whereClause,
            include: {
                user: {
                    include: {
                        salesPerson: true,
                        province: true,
                        city: true,
                        district: true,
                        village: true,
                        subscription: true,
                    },
                },
            },
            orderBy: {
                paidAt: 'desc',
            },
        });

        // Generate CSV
        const headers = [
            'Invoice Number',
            'Tanggal Pembayaran',
            'Jumlah',
            'Kategori',
            'Tipe',
            'Nama Pelanggan',
            'Telepon',
            'Sales',
            'Provinsi',
            'Kota',
            'Kecamatan',
            'Kelurahan',
            'Paket',
            'Deskripsi',
        ];

        const rows = invoices.map(inv => [
            inv.invoiceNumber || `#${inv.id.slice(-6).toUpperCase()}`,
            inv.paidAt?.toLocaleDateString('id-ID') || '',
            Number(inv.amount).toLocaleString('id-ID'),
            inv.category,
            inv.type,
            inv.user.name,
            inv.user.phone,
            inv.user.salesPerson?.name || '',
            inv.user.province?.name || '',
            inv.user.city?.name || '',
            inv.user.district?.name || '',
            inv.user.village?.name || '',
            inv.user.subscription?.planName || '',
            inv.description || '',
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        // Add BOM for Excel UTF-8 support
        const BOM = '\uFEFF';
        const csvWithBOM = BOM + csvContent;

        return new NextResponse(csvWithBOM, {
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="revenue-report-${period}-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch (error: any) {
        console.error('[Revenue Report Export] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to export revenue report',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

