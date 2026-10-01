import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Test endpoint to check invoices for user "steven"
 */
export async function GET() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Find user steven
        const user = await prisma.user.findFirst({
            where: {
                name: {
                    contains: 'steven',
                    mode: 'insensitive',
                },
            },
            include: {
                invoices: {
                    orderBy: { createdAt: 'desc' },
                },
                subscription: true,
            },
        });

        if (!user) {
            return NextResponse.json({
                success: false,
                message: 'User "steven" not found',
            });
        }

        // Check all invoices
        const allInvoices = user.invoices.map(inv => {
            const dueDate = new Date(inv.dueDate);
            const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            
            return {
                id: inv.id,
                invoiceNumber: inv.invoiceNumber,
                amount: Number(inv.amount),
                dueDate: inv.dueDate,
                status: inv.status,
                daysOverdue: daysOverdue,
                isOverdue: dueDate < today,
                createdAt: inv.createdAt,
            };
        });

        // Check which invoices match our reminder criteria
        const h5Date = new Date(today);
        h5Date.setDate(h5Date.getDate() + 5);
        const h2Date = new Date(today);
        h2Date.setDate(h2Date.getDate() + 2);
        const h0Date = new Date(today);
        const d1Date = new Date(today);
        d1Date.setDate(d1Date.getDate() - 1);
        const d2Date = new Date(today);
        d2Date.setDate(d2Date.getDate() - 2);
        const d5Date = new Date(today);
        d5Date.setDate(d5Date.getDate() - 5);

        const matchingInvoices = user.invoices
            .filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE')
            .map(inv => {
                const dueDate = new Date(inv.dueDate);
                const dueDateStart = new Date(dueDate);
                dueDateStart.setHours(0, 0, 0, 0);
                
                let reminderType: string | null = null;
                
                // Check H-5
                if (dueDateStart >= h5Date && dueDateStart < new Date(h5Date.getTime() + 24 * 60 * 60 * 1000)) {
                    reminderType = 'H-5';
                }
                // Check H-2
                else if (dueDateStart >= h2Date && dueDateStart < new Date(h2Date.getTime() + 24 * 60 * 60 * 1000)) {
                    reminderType = 'H-2';
                }
                // Check H-0
                else if (dueDateStart >= h0Date && dueDateStart < new Date(h0Date.getTime() + 24 * 60 * 60 * 1000)) {
                    reminderType = 'H-0';
                }
                // Check D+1
                else if (dueDateStart >= d1Date && dueDateStart < new Date(d1Date.getTime() + 24 * 60 * 60 * 1000)) {
                    reminderType = 'D+1';
                }
                // Check D+2
                else if (dueDateStart >= d2Date && dueDateStart < new Date(d2Date.getTime() + 24 * 60 * 60 * 1000)) {
                    reminderType = 'D+2';
                }
                // Check D+5
                else if (dueDateStart >= d5Date && dueDateStart < new Date(d5Date.getTime() + 24 * 60 * 60 * 1000)) {
                    reminderType = 'D+5';
                }
                
                return {
                    invoice: {
                        id: inv.id,
                        invoiceNumber: inv.invoiceNumber,
                        amount: Number(inv.amount),
                        dueDate: inv.dueDate,
                        status: inv.status,
                    },
                    reminderType,
                    daysOverdue: Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
                };
            })
            .filter(item => item.reminderType !== null);

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                status: user.status,
            },
            subscription: user.subscription ? {
                id: user.subscription.id,
                price: Number(user.subscription.price),
                billingCycle: user.subscription.billingCycle,
                nextBillingDate: user.subscription.nextBillingDate,
                isTrialActive: user.subscription.isTrialActive,
                isPrepaidActive: user.subscription.isPrepaidActive,
            } : null,
            invoices: {
                total: allInvoices.length,
                all: allInvoices,
                unpaid: allInvoices.filter(inv => inv.status === 'UNPAID' || inv.status === 'OVERDUE'),
                overdue: allInvoices.filter(inv => inv.isOverdue && (inv.status === 'UNPAID' || inv.status === 'OVERDUE')),
            },
            matchingReminders: matchingInvoices,
            dateInfo: {
                today: today.toISOString(),
                h5Date: h5Date.toISOString(),
                h2Date: h2Date.toISOString(),
                h0Date: h0Date.toISOString(),
                d1Date: d1Date.toISOString(),
                d2Date: d2Date.toISOString(),
                d5Date: d5Date.toISOString(),
            },
        });
    } catch (error: any) {
        console.error('[Test Check Steven] Error:', error);
        return NextResponse.json(
            { 
                success: false,
                error: 'Failed to check user steven', 
                message: error.message 
            },
            { status: 500 }
        );
    }
}

