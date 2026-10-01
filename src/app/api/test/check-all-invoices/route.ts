import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Test endpoint to check all invoices in the system
 */
export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all invoices
        const allInvoices = await prisma.invoice.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        status: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });

        // Format invoices
        const formattedInvoices = allInvoices.map(inv => {
            const dueDate = new Date(inv.dueDate);
            const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = dueDate < today;
            
            return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                amount: Number(inv.amount),
                dueDate: inv.dueDate,
                status: inv.status,
                category: inv.category,
                type: inv.type,
                daysOverdue: daysOverdue,
                isOverdue: isOverdue,
                createdAt: inv.createdAt,
                customer: {
                    id: inv.user.id,
                    name: inv.user.name,
                    phone: inv.user.phone,
                    status: inv.user.status,
                },
            };
        });

        // Filter invoices
        const unpaidInvoices = formattedInvoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE');
        const overdueInvoices = formattedInvoices.filter(inv => inv.isOverdue && (inv.status === 'UNPAID' || inv.status === 'OVERDUE'));
        const stevenInvoices = formattedInvoices.filter(inv => inv.customer.name.toLowerCase().includes('steven'));

        return NextResponse.json({
            success: true,
            summary: {
                total: allInvoices.length,
                unpaid: unpaidInvoices.length,
                overdue: overdueInvoices.length,
                steven: stevenInvoices.length,
            },
            invoices: {
                all: formattedInvoices,
                unpaid: unpaidInvoices,
                overdue: overdueInvoices,
                steven: stevenInvoices,
            },
            dateInfo: {
                today: today.toISOString(),
            },
        });
    } catch (error: any) {
        console.error('[Test Check All Invoices] Error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to check invoices', 
                message: error.message 
            },
            { status: 500 }
        );
    }
}

