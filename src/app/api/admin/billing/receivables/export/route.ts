import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const format = searchParams.get('format') || 'csv'; // csv or pdf

        // Build filters (same as main receivables endpoint)
        const where: any = {
            status: { in: ['UNPAID', 'OVERDUE', 'EXPIRED'] },
            deletedAt: null,
            collectionStatus: { not: 'WRITE_OFF' },
        };

        // Apply filters from query params
        if (searchParams.get('status')) {
            const statuses = searchParams.get('status')?.split(',').filter(Boolean);
            if (statuses && statuses.length > 0) {
                where.status = { in: statuses };
            }
        }

        if (searchParams.get('category')) {
            where.category = searchParams.get('category');
        }

        if (searchParams.get('collectionStatus')) {
            where.collectionStatus = searchParams.get('collectionStatus');
        }

        if (searchParams.get('startDate') || searchParams.get('endDate')) {
            where.dueDate = {};
            if (searchParams.get('startDate')) {
                const start = new Date(searchParams.get('startDate')!);
                start.setHours(0, 0, 0, 0);
                where.dueDate.gte = start;
            }
            if (searchParams.get('endDate')) {
                const end = new Date(searchParams.get('endDate')!);
                end.setHours(23, 59, 59, 999);
                where.dueDate.lte = end;
            }
        }

        // User filters
        const userWhere: any = {};
        if (searchParams.get('salesId')) {
            userWhere.salesPersonId = searchParams.get('salesId');
        }
        if (searchParams.get('provinceId')) {
            userWhere.provinceId = searchParams.get('provinceId');
        }
        if (searchParams.get('cityId')) {
            userWhere.cityId = searchParams.get('cityId');
        }
        if (searchParams.get('districtId')) {
            userWhere.districtId = searchParams.get('districtId');
        }
        if (searchParams.get('villageId')) {
            userWhere.villageId = searchParams.get('villageId');
        }

        if (Object.keys(userWhere).length > 0) {
            where.user = userWhere;
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
                        district: { select: { name: true } },
                        village: { select: { name: true } },
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
        });

        // Process invoices with aging
        const processedInvoices = invoices.map((invoice) => {
            const aging = calculateAging(invoice.dueDate);
            const bucket = getAgingBucket(aging);

            return {
                invoiceNumber: invoice.invoiceNumber || `#${invoice.id.slice(-6).toUpperCase()}`,
                createdAt: invoice.createdAt.toISOString().split('T')[0],
                dueDate: invoice.dueDate.toISOString().split('T')[0],
                aging,
                agingBucket: bucket,
                customerName: invoice.user.name,
                customerPhone: invoice.user.phone,
                customerEmail: invoice.user.email || '',
                sales: invoice.user.salesPerson?.name || '',
                location: [
                    invoice.user.province?.name,
                    invoice.user.city?.name,
                    invoice.user.district?.name,
                    invoice.user.village?.name,
                ].filter(Boolean).join(', '),
                category: invoice.category,
                amount: Number(invoice.amount),
                status: invoice.status,
                collectionStatus: invoice.collectionStatus || 'NOT_COLLECTED',
                collectionNotes: invoice.collectionNotes || '',
            };
        });

        if (format === 'csv') {
            // Generate CSV
            const headers = [
                'Invoice Number',
                'Tanggal Invoice',
                'Due Date',
                'Umur (Hari)',
                'Aging Bucket',
                'Pelanggan',
                'Phone',
                'Email',
                'Sales',
                'Lokasi',
                'Kategori',
                'Jumlah',
                'Status',
                'Collection Status',
                'Notes',
            ];

            const rows = processedInvoices.map((inv) => [
                inv.invoiceNumber,
                inv.createdAt,
                inv.dueDate,
                inv.aging.toString(),
                inv.agingBucket,
                inv.customerName,
                inv.customerPhone,
                inv.customerEmail,
                inv.sales,
                inv.location,
                inv.category,
                inv.amount.toString(),
                inv.status,
                inv.collectionStatus,
                inv.collectionNotes,
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
            ].join('\n');

            return new NextResponse(csvContent, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': `attachment; filename="receivables-${new Date().toISOString().split('T')[0]}.csv"`,
                },
            });
        } else {
            // PDF export would require a PDF library like pdfkit or puppeteer
            // For now, return JSON
            return NextResponse.json({
                success: true,
                message: 'PDF export not yet implemented',
                data: processedInvoices,
            });
        }
    } catch (error: any) {
        console.error('Error exporting receivables:', error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}

