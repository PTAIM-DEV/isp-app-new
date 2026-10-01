import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Get invoices for admin dashboard with pagination and filters
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);

        // Query parameters
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const status = searchParams.get('status'); // PAID, UNPAID, OVERDUE, EXPIRED, atau ALL
        const showDeleted = searchParams.get('showDeleted') === 'true';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const customerName = searchParams.get('customerName');
        const invoiceNumber = searchParams.get('invoiceNumber');

        // Build where clause
        const where: any = {};

        // Filter deleted invoices
        if (showDeleted) {
            // Show only deleted invoices
            where.deletedAt = { not: null };
        } else {
            // Show only active invoices (default)
            where.deletedAt = null;
        }

        if (status && status !== 'ALL') {
            if (status === 'EXPIRED') {
                where.status = { in: ['OVERDUE', 'EXPIRED'] };
            } else {
                where.status = status;
            }
        }

        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) {
                where.createdAt.gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                where.createdAt.lte = end;
            }
        }

        if (customerName) {
            where.user = {
                name: {
                    contains: customerName,
                    mode: 'insensitive',
                },
            };
        }

        if (invoiceNumber) {
            where.invoiceNumber = {
                contains: invoiceNumber,
                mode: 'insensitive',
            };
        }

        // Get total count
        const total = await prisma.invoice.count({ where });

        // Get invoices with pagination
        const invoices = await prisma.invoice.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
                paymentTransactions: {
                    select: {
                        paymentMethod: true,
                        paymentChannel: true,
                        status: true,
                        paidAt: true
                    },
                    where: {
                        status: 'PAID'
                    },
                    take: 1
                },
                scheduledReminders: {
                    select: {
                        sentAt: true,
                        status: true,
                        reminderType: true,
                        emailSent: true,
                        whatsappSent: true
                    },
                    where: {
                        status: 'SENT'
                    },
                    orderBy: {
                        sentAt: 'desc'
                    },
                    take: 1
                }
            },
            orderBy: {
                createdAt: 'desc',
            },
            skip: (page - 1) * limit,
            take: limit,
        });

        // Format response
        const formattedInvoices = invoices.map(invoice => ({
            id: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            amount: Number(invoice.amount),
            dueDate: invoice.dueDate,
            status: invoice.status,
            xenditUrl: invoice.xenditUrl,
            createdAt: invoice.createdAt,
            deletedAt: invoice.deletedAt,
            user: {
                id: invoice.user.id,
                name: invoice.user.name,
                phone: invoice.user.phone,
                email: invoice.user.email,
            },
            paymentMethod: invoice.paymentTransactions[0]?.paymentMethod || null,
            paymentChannel: invoice.paymentTransactions[0]?.paymentChannel || null,
            paidAt: invoice.paymentTransactions[0]?.paidAt || invoice.paidAt || null,
            lastReminder: invoice.scheduledReminders[0] ? {
                sentAt: invoice.scheduledReminders[0].sentAt,
                type: invoice.scheduledReminders[0].reminderType,
                via: {
                    email: invoice.scheduledReminders[0].emailSent,
                    whatsapp: invoice.scheduledReminders[0].whatsappSent
                }
            } : null
        }));

        // Calculate total amounts
        const allInvoices = await prisma.invoice.findMany({
            where,
            select: {
                amount: true,
                status: true,
            },
        });

        const totalAmount = allInvoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
        const paidAmount = allInvoices
            .filter(inv => inv.status === 'PAID')
            .reduce((sum, inv) => sum + Number(inv.amount), 0);
        const unpaidAmount = allInvoices
            .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE' || inv.status === 'EXPIRED')
            .reduce((sum, inv) => sum + Number(inv.amount), 0);
        const overdueAmount = allInvoices
            .filter(inv => inv.status === 'OVERDUE' || inv.status === 'EXPIRED')
            .reduce((sum, inv) => sum + Number(inv.amount), 0);

        return NextResponse.json({
            success: true,
            data: {
                invoices: formattedInvoices,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
                statistics: {
                    totalAmount,
                    paidAmount,
                    unpaidAmount,
                    overdueAmount,
                    arpu: 0,
                    activeUserCount: 0
                },
            },
        });

        // Calculate ARPU (Average Revenue Per User)
        // ARPU = Total Revenue This Month / Total Active Users

        // 1. Get Active Users Count (Active + Blocked/Overdue)
        const activeUserCount = await prisma.user.count({
            where: {
                status: {
                    in: ['ACTIVE', 'BLOCKED']
                }
            }
        });

        // 2. Get Total Lifetime Revenue (PAID only)
        const totalRevenueAgg = await prisma.invoice.aggregate({
            _sum: {
                amount: true
            },
            where: {
                status: 'PAID',
                deletedAt: null
            }
        });

        const totalRevenue = Number(totalRevenueAgg._sum.amount || 0);
        // Avoid division by zero
        const arpu = activeUserCount > 0 ? totalRevenue / activeUserCount : 0;

        return NextResponse.json({
            success: true,
            data: {
                invoices: formattedInvoices,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
                statistics: {
                    totalAmount,
                    paidAmount,
                    unpaidAmount,
                    overdueAmount,
                    arpu,
                    activeUserCount
                },
            },
        });
    } catch (error: any) {
        console.error('[Admin Invoices] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to fetch invoices',
                message: error.message,
            },
            { status: 500 }
        );
    }
}

