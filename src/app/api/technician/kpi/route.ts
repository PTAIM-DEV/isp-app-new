import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { calculateKPI } from '@/lib/kpi-calculator';

export const dynamic = 'force-dynamic';

// GET /api/technician/kpi - Get KPI for current technician
export async function GET(request: Request) {
    try {
        // Get current technician from session
        const cookieStore = await cookies();
        const session = cookieStore.get('technician_session');

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Find technician by session
        const sessions = await prisma.systemSetting.findMany({
            where: {
                key: { startsWith: 'technician_session_' }
            }
        });

        let technicianId: string | null = null;
        for (const sessionData of sessions) {
            try {
                const { token } = JSON.parse(sessionData.value);
                if (token === session.value) {
                    technicianId = sessionData.key.replace('technician_session_', '');
                    break;
                }
            } catch (e) {
                // Skip invalid session data
            }
        }

        if (!technicianId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);
        const months = parseInt(searchParams.get('months') || '3'); // Last 3 months by default

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);

        // Get saved KPI records
        const kpiRecords = await prisma.kPIRecord.findMany({
            where: {
                technicianUserId: technicianId,
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

