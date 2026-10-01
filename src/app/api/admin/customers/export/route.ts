import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { filters, fields } = body;

        // Build where clause (copy from page.tsx logic but reusable)
        const where: any = {
            role: 'CUSTOMER',
        };

        const status = filters.status || 'ALL';
        const search = filters.search || '';
        const provinceId = filters.provinceId || '';
        const cityId = filters.cityId || '';
        const salesId = filters.salesId || '';
        const packageId = filters.packageId || '';
        const nextBillingDateFrom = filters.nextBillingDateFrom || '';
        const nextBillingDateTo = filters.nextBillingDateTo || '';

        // Filter by status
        if (status === 'DELETED') {
            where.deletedAt = { not: null };
        } else {
            where.deletedAt = null;
            if (status !== 'ALL') {
                where.status = status;
            }
        }

        // Filter by province
        if (provinceId) where.provinceId = provinceId;

        // Filter by city
        if (cityId) where.cityId = cityId;

        // Filter by sales
        if (salesId) where.salesPersonId = salesId;

        // Filter by package
        if (packageId) {
            const packageData = await prisma.servicePackage.findUnique({
                where: { id: packageId },
                select: { name: true },
            });
            if (packageData) {
                where.subscription = {
                    planName: packageData.name,
                };
            }
        }

        // Filter by next billing date range
        if (nextBillingDateFrom || nextBillingDateTo) {
            const subscriptionFilter: any = {};
            if (nextBillingDateFrom) {
                const fromDate = new Date(nextBillingDateFrom);
                fromDate.setHours(0, 0, 0, 0);
                subscriptionFilter.gte = fromDate;
            }
            if (nextBillingDateTo) {
                const toDate = new Date(nextBillingDateTo);
                toDate.setHours(23, 59, 59, 999);
                subscriptionFilter.lte = toDate;
            }
            if (Object.keys(subscriptionFilter).length > 0) {
                where.subscription = {
                    ...where.subscription,
                    nextBillingDate: subscriptionFilter,
                };
            }
        }

        // Filter by search query
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { email: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { nik: { contains: search, mode: 'insensitive' } },
            ];
        }

        // Fetch customers
        const customers = await prisma.user.findMany({
            where,
            include: {
                subscription: true,
                salesPerson: true,
                province: true,
                city: true,
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 1, // Get latest invoice for Xendit ID
                },
                assignedPaymentFlow: true,
            },
            orderBy: { createdAt: 'desc' },
        });

        // Generate CSV
        const headers: string[] = [];
        const fieldKeys: string[] = [];

        // Map selected fields to headers and keys
        if (fields.includes('name')) { headers.push('Nama'); fieldKeys.push('name'); }
        if (fields.includes('email')) { headers.push('Email'); fieldKeys.push('email'); }
        if (fields.includes('phone')) { headers.push('Telepon'); fieldKeys.push('phone'); }
        if (fields.includes('nik')) { headers.push('NIK'); fieldKeys.push('nik'); }
        if (fields.includes('status')) { headers.push('Status'); fieldKeys.push('status'); }
        if (fields.includes('address')) { headers.push('Alamat'); fieldKeys.push('address'); }
        if (fields.includes('province')) { headers.push('Provinsi'); fieldKeys.push('province'); }
        if (fields.includes('city')) { headers.push('Kota'); fieldKeys.push('city'); }
        if (fields.includes('package')) { headers.push('Paket'); fieldKeys.push('package'); }
        if (fields.includes('price')) { headers.push('Harga'); fieldKeys.push('price'); }
        if (fields.includes('sales')) { headers.push('Sales'); fieldKeys.push('sales'); }
        if (fields.includes('xenditId')) { headers.push('Xendit ID'); fieldKeys.push('xenditId'); }
        if (fields.includes('createdAt')) { headers.push('Tanggal Daftar'); fieldKeys.push('createdAt'); }

        let csvContent = headers.join(',') + '\n';

        customers.forEach(customer => {
            const row = fieldKeys.map(key => {
                let value = '';
                switch (key) {
                    case 'name': value = customer.name; break;
                    case 'email': value = customer.email || '-'; break;
                    case 'phone': value = customer.phone; break;
                    case 'nik': value = customer.nik || '-'; break;
                    case 'status': value = customer.status; break;
                    case 'address': value = customer.address || '-'; break;
                    case 'province': value = customer.province?.name || '-'; break;
                    case 'city': value = customer.city?.name || '-'; break;
                    case 'package': value = customer.subscription?.planName || '-'; break;
                    case 'price': value = customer.subscription?.price?.toString() || '-'; break;
                    case 'sales': value = customer.salesPerson?.name || '-'; break;
                    case 'xenditId': value = customer.invoices?.[0]?.xenditId || '-'; break; // Get from latest invoice
                    case 'createdAt': value = customer.createdAt.toISOString().split('T')[0]; break;
                    default: value = '';
                }
                // Escape quotes and wrap in quotes if contains comma
                const stringValue = String(value).replace(/"/g, '""');
                if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                    return `"${stringValue}"`;
                }
                return stringValue;
            });
            csvContent += row.join(',') + '\n';
        });

        return new NextResponse(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="customers-export-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error('Export error:', error);
        return NextResponse.json({ error: 'Failed to generate export' }, { status: 500 });
    }
}
