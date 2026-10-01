import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculateKPI } from '@/lib/kpi-calculator';

export const dynamic = 'force-dynamic';

// GET /api/admin/technicians/kpi/[technicianId] - Get KPI for specific technician
export async function GET(
    request: Request,
    { params }: { params: Promise<{ technicianId: string }> }
) {
    try {
        const { technicianId } = await params;
        const { searchParams } = new URL(request.url);
        const periodTypeParam = searchParams.get('periodType') || 'MONTHLY';
        const periodType = (periodTypeParam === 'DAILY' || periodTypeParam === 'WEEKLY' || periodTypeParam === 'MONTHLY')
            ? periodTypeParam
            : 'MONTHLY';
        const months = parseInt(searchParams.get('months') || '3'); // Last 3 months by default

        // Get technician
        const technician = await prisma.user.findFirst({
            where: {
                id: technicianId,
                role: 'TECHNICIAN'
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                status: true,
            },
        });

        if (!technician) {
            return NextResponse.json(
                { error: 'Technician not found' },
                { status: 404 }
            );
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        // Get saved KPI records
        const kpiRecords = await prisma.kPIRecord.findMany({
            where: {
                technicianUserId: technicianId,
                periodType,
                periodStart: {
                    gte: startDate,
                },
            },
            orderBy: {
                periodStart: 'desc',
            },
        });

        // Calculate current period KPI
        const currentMetrics = await calculateKPI(technicianId, startDate, endDate);

        // Calculate summary statistics
        const summary = {
            totalTasks: kpiRecords.reduce((sum, r) => sum + r.totalTasks, 0) + currentMetrics.totalTasks,
            completedTasks: kpiRecords.reduce((sum, r) => sum + r.completedTasks, 0) + currentMetrics.completedTasks,
            averageCompletionRate: kpiRecords.length > 0
                ? kpiRecords.reduce((sum, r) => sum + r.completionRate, 0) / kpiRecords.length
                : currentMetrics.completionRate,
            averageOnTimeRate: kpiRecords.length > 0
                ? kpiRecords.reduce((sum, r) => sum + r.onTimeRate, 0) / kpiRecords.length
                : currentMetrics.onTimeRate,
            averageQualityScore: kpiRecords.length > 0
                ? kpiRecords.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / kpiRecords.length
                : currentMetrics.qualityScore,
        };

        return NextResponse.json({
            technician,
            currentMetrics,
            historicalRecords: kpiRecords,
            summary,
        });
    } catch (error: any) {
        console.error('Error fetching technician KPI:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch KPI data' },
            { status: 500 }
        );
    }
}

