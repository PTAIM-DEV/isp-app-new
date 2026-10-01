import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Test endpoint to check invoices that are overdue or past due
 * This endpoint only checks and reports, does not send reminders
 */
export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        console.log(`[Test Check Overdue] Starting at ${new Date().toISOString()}`);
        console.log(`[Test Check Overdue] Today: ${today.toISOString()}`);

        // Calculate dates for reminders (before due date)
        const h5Date = new Date(today);
        h5Date.setDate(h5Date.getDate() + 5);

        const h2Date = new Date(today);
        h2Date.setDate(h2Date.getDate() + 2);

        const h0Date = new Date(today);

        // Calculate dates for overdue reminders (after due date)
        const d1Date = new Date(today);
        d1Date.setDate(d1Date.getDate() - 1);

        const d2Date = new Date(today);
        d2Date.setDate(d2Date.getDate() - 2);

        const d5Date = new Date(today);
        d5Date.setDate(d5Date.getDate() - 5);

        // Find all invoices that need reminders
        const [h5Invoices, h2Invoices, h0Invoices, d1Invoices, d2Invoices, d5Invoices, allOverdue] = await Promise.all([
            // H-5: 5 days before due date
            prisma.invoice.findMany({
                where: {
                    status: { in: ['UNPAID', 'OVERDUE'] },
                    dueDate: {
                        gte: h5Date,
                        lt: new Date(h5Date.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                include: { 
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                            status: true,
                        }
                    }
                },
                orderBy: { dueDate: 'asc' },
            }),
            // H-2: 2 days before due date
            prisma.invoice.findMany({
                where: {
                    status: { in: ['UNPAID', 'OVERDUE'] },
                    dueDate: {
                        gte: h2Date,
                        lt: new Date(h2Date.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                include: { 
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                            status: true,
                        }
                    }
                },
                orderBy: { dueDate: 'asc' },
            }),
            // H-0: Due today
            prisma.invoice.findMany({
                where: {
                    status: { in: ['UNPAID', 'OVERDUE'] },
                    dueDate: {
                        gte: h0Date,
                        lt: new Date(h0Date.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                include: { 
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                            status: true,
                        }
                    }
                },
                orderBy: { dueDate: 'asc' },
            }),
            // D+1: 1 day overdue
            prisma.invoice.findMany({
                where: {
                    status: { in: ['UNPAID', 'OVERDUE'] },
                    dueDate: {
                        gte: d1Date,
                        lt: new Date(d1Date.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                include: { 
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                            status: true,
                        }
                    }
                },
                orderBy: { dueDate: 'asc' },
            }),
            // D+2: 2 days overdue
            prisma.invoice.findMany({
                where: {
                    status: { in: ['UNPAID', 'OVERDUE'] },
                    dueDate: {
                        gte: d2Date,
                        lt: new Date(d2Date.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                include: { 
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                            status: true,
                        }
                    }
                },
                orderBy: { dueDate: 'asc' },
            }),
            // D+5: 5 days overdue
            prisma.invoice.findMany({
                where: {
                    status: { in: ['UNPAID', 'OVERDUE'] },
                    dueDate: {
                        gte: d5Date,
                        lt: new Date(d5Date.getTime() + 24 * 60 * 60 * 1000),
                    },
                },
                include: { 
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                            status: true,
                        }
                    }
                },
                orderBy: { dueDate: 'asc' },
            }),
            // All overdue invoices (dueDate < today)
            prisma.invoice.findMany({
                where: {
                    status: { in: ['UNPAID', 'OVERDUE'] },
                    dueDate: {
                        lt: today,
                    },
                },
                include: { 
                    user: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            email: true,
                            status: true,
                        }
                    }
                },
                orderBy: { dueDate: 'asc' },
            }),
        ]);

        // Calculate days overdue for each invoice
        const formatInvoice = (invoice: any) => {
            const daysOverdue = Math.floor((today.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24));
            return {
                id: invoice.id,
                invoiceNumber: invoice.invoiceNumber,
                amount: Number(invoice.amount),
                dueDate: invoice.dueDate,
                status: invoice.status,
                daysOverdue: daysOverdue,
                customer: {
                    name: invoice.user.name,
                    phone: invoice.user.phone,
                    email: invoice.user.email,
                    status: invoice.user.status,
                },
            };
        };

        const summary = {
            h5: {
                count: h5Invoices.length,
                invoices: h5Invoices.map(formatInvoice),
            },
            h2: {
                count: h2Invoices.length,
                invoices: h2Invoices.map(formatInvoice),
            },
            h0: {
                count: h0Invoices.length,
                invoices: h0Invoices.map(formatInvoice),
            },
            d1: {
                count: d1Invoices.length,
                invoices: d1Invoices.map(formatInvoice),
            },
            d2: {
                count: d2Invoices.length,
                invoices: d2Invoices.map(formatInvoice),
            },
            d5: {
                count: d5Invoices.length,
                invoices: d5Invoices.map(formatInvoice),
            },
            allOverdue: {
                count: allOverdue.length,
                invoices: allOverdue.map(formatInvoice),
            },
            totals: {
                totalInvoicesToRemind: h5Invoices.length + h2Invoices.length + h0Invoices.length + d1Invoices.length + d2Invoices.length + d5Invoices.length,
                totalOverdue: allOverdue.length,
            },
        };

        console.log(`[Test Check Overdue] Summary:`, {
            h5: h5Invoices.length,
            h2: h2Invoices.length,
            h0: h0Invoices.length,
            d1: d1Invoices.length,
            d2: d2Invoices.length,
            d5: d5Invoices.length,
            allOverdue: allOverdue.length,
        });

        return NextResponse.json({
            success: true,
            message: 'Invoice check completed',
            date: {
                today: today.toISOString(),
                h5Date: h5Date.toISOString(),
                h2Date: h2Date.toISOString(),
                h0Date: h0Date.toISOString(),
                d1Date: d1Date.toISOString(),
                d2Date: d2Date.toISOString(),
                d5Date: d5Date.toISOString(),
            },
            summary,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        console.error('[Test Check Overdue] Error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to check overdue invoices', 
                message: error.message 
            },
            { status: 500 }
        );
    }
}

