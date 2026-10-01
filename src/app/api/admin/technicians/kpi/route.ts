import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateKPI } from '@/lib/kpi-calculator';

export const dynamic = 'force-dynamic';

// GET /api/admin/technicians/kpi - Get KPI data
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const technicianId = searchParams.get('technicianId');
        const periodType = searchParams.get('periodType') || 'MONTHLY'; // DAILY, WEEKLY, MONTHLY
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // If date range provided, calculate KPI for that range
        if (startDate && endDate && technicianId) {
            const periodStart = new Date(startDate);
            const periodEnd = new Date(endDate);
            const metrics = await calculateKPI(technicianId, periodStart, periodEnd);

            return NextResponse.json({
                technicianId,
                periodStart,
                periodEnd,
                periodType: 'CUSTOM',
                metrics,
            });
        }

        // Get saved KPI records
        const where: any = {};
        if (technicianId) {
            where.technicianUserId = technicianId;
        }
        if (periodType !== 'ALL') {
            where.periodType = periodType;
        }

        const kpiRecords = await prisma.kPIRecord.findMany({
            where,
            include: {
                technicianUser: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
            orderBy: [
                { periodStart: 'desc' },
                { createdAt: 'desc' },
            ],
            take: 100, // Limit to last 100 records
        });

        return NextResponse.json({
            records: kpiRecords.map(record => ({
                ...record,
                technician: record.technicianUser
            })),
        });
    } catch (error: any) {
        console.error('Error fetching KPI data:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch KPI data' },
            { status: 500 }
        );
    }
}

// POST /api/admin/technicians/kpi/calculate - Calculate and save KPI
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { technicianId, periodStart, periodEnd, periodType } = body;

        if (!technicianId || !periodStart || !periodEnd || !periodType) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        const { calculateAndSaveKPI } = await import('@/lib/kpi-calculator');
        await calculateAndSaveKPI(
            technicianId,
            new Date(periodStart),
            new Date(periodEnd),
            periodType
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error calculating KPI:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to calculate KPI' },
            { status: 500 }
        );
    }
}

