import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { formatDate } from '@/lib/utils';

export async function GET() {
    try {
        const invoices = await prisma.invoice.findMany({
            where: {
                status: 'PAID',
                deletedAt: null,
            },
            include: {
                user: true,
            },
            orderBy: {
                paidAt: 'desc',
            },
        });

        const csvHeader = 'Invoice ID,Pelanggan,Telepon,Jumlah,Status,Jatuh Tempo,Dibayar Pada\n';
        const csvRows = invoices.map((invoice: any) => {
            const paidAt = invoice.paidAt ? formatDate(invoice.paidAt) : '-';
            const dueDate = formatDate(invoice.dueDate);
            // Escape commas in names
            const name = `"${invoice.user.name}"`;

            return `${invoice.id},${name},${invoice.user.phone},${invoice.amount},${invoice.status},${dueDate},${paidAt}`;
        }).join('\n');

        const csvContent = csvHeader + csvRows;

        return new NextResponse(csvContent, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="paid_invoices_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch (error) {
        console.error('Export CSV error:', error);
        return NextResponse.json({ error: 'Gagal export CSV' }, { status: 500 });
    }
}
