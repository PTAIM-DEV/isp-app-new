import { prisma } from './prisma';

export interface KPIMetrics {
    totalTasks: number;
    completedTasks: number;
    onTimeTasks: number;
    failedTasks: number;
    totalTimeSpent: number; // minutes
    averageTimeSpent: number; // minutes
    completionRate: number; // percentage
    onTimeRate: number; // percentage
    tasksPerDay: number;
    qualityScore: number; // 0-100
}

/**
 * Calculate KPI for a technician for a specific period
 */
export async function calculateKPI(
    technicianId: string, // This is now technicianUserId
    periodStart: Date,
    periodEnd: Date
): Promise<KPIMetrics> {
    // Get all tasks (installations and maintenance) assigned to technician in this period
    const installations = await prisma.installation.findMany({
        where: {
            technicianUserId: technicianId,
            scheduledDate: {
                gte: periodStart,
                lte: periodEnd,
            },
        },
        include: {
            reports: {
                where: {
                    technicianUserId: technicianId,
                },
            },
        },
    });

    const maintenanceTasks = await prisma.maintenanceTask.findMany({
        where: {
            technicianUserId: technicianId,
            scheduledDate: {
                gte: periodStart,
                lte: periodEnd,
            },
        },
        include: {
            reports: {
                where: {
                    technicianUserId: technicianId,
                },
            },
        },
    });

    // Combine all tasks
    const allTasks = [
        ...installations.map(inst => ({
            id: inst.id,
            type: 'INSTALLATION' as const,
            scheduledDate: inst.scheduledDate,
            completedDate: inst.completedDate,
            status: inst.status,
            reports: inst.reports,
        })),
        ...maintenanceTasks.map(mt => ({
            id: mt.id,
            type: 'MAINTENANCE' as const,
            scheduledDate: mt.scheduledDate,
            completedDate: mt.completedDate,
            status: mt.status,
            reports: mt.reports,
        })),
    ];

    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t =>
        t.status === 'COMPLETED' || t.reports.some(r => r.status === 'SUCCESS')
    ).length;

    const failedTasks = allTasks.filter(t =>
        t.status === 'FAILED' || t.reports.some(r => r.status === 'FAILED')
    ).length;

    // Calculate on-time tasks (completed on or before scheduled date)
    const onTimeTasks = allTasks.filter(task => {
        if (!task.completedDate || !task.scheduledDate) return false;
        const completed = new Date(task.completedDate);
        const scheduled = new Date(task.scheduledDate);
        // Consider on-time if completed on the same day or before scheduled date
        return completed <= scheduled ||
            (completed.toDateString() === scheduled.toDateString());
    }).length;

    // Calculate time spent from reports
    const allReports = allTasks.flatMap(t => t.reports);
    const totalTimeSpent = allReports.reduce((sum, report) =>
        sum + (report.timeSpent || 0), 0
    );
    const averageTimeSpent = completedTasks > 0
        ? totalTimeSpent / completedTasks
        : 0;

    // Calculate rates
    const completionRate = totalTasks > 0
        ? (completedTasks / totalTasks) * 100
        : 0;
    const onTimeRate = completedTasks > 0
        ? (onTimeTasks / completedTasks) * 100
        : 0;

    // Calculate tasks per day
    const daysDiff = Math.max(1, Math.ceil(
        (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    ));
    const tasksPerDay = totalTasks / daysDiff;

    // Calculate quality score (0-100)
    // Based on: completion rate (40%), on-time rate (30%), revision rate (20%), failure rate (10%)
    const revisionCount = allReports.filter(r => r.needsRevision).length;
    const revisionRate = completedTasks > 0
        ? (revisionCount / completedTasks) * 100
        : 0;
    const failureRate = totalTasks > 0
        ? (failedTasks / totalTasks) * 100
        : 0;

    const qualityScore = Math.max(0, Math.min(100,
        (completionRate * 0.4) +
        (onTimeRate * 0.3) +
        ((100 - revisionRate) * 0.2) +
        ((100 - failureRate) * 0.1)
    ));

    return {
        totalTasks,
        completedTasks,
        onTimeTasks,
        failedTasks,
        totalTimeSpent,
        averageTimeSpent,
        completionRate: Math.round(completionRate * 100) / 100,
        onTimeRate: Math.round(onTimeRate * 100) / 100,
        tasksPerDay: Math.round(tasksPerDay * 100) / 100,
        qualityScore: Math.round(qualityScore * 100) / 100,
    };
}

/**
 * Calculate and save KPI record for a technician for a specific period
 */
export async function calculateAndSaveKPI(
    technicianId: string, // now technicianUserId
    periodStart: Date,
    periodEnd: Date,
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY'
): Promise<void> {
    const metrics = await calculateKPI(technicianId, periodStart, periodEnd);

    // Check if record already exists
    const existing = await prisma.kPIRecord.findFirst({
        where: {
            technicianUserId: technicianId,
            periodStart: {
                gte: new Date(periodStart.getTime() - 1000), // Allow 1 second tolerance
                lte: new Date(periodStart.getTime() + 1000),
            },
            periodEnd: {
                gte: new Date(periodEnd.getTime() - 1000),
                lte: new Date(periodEnd.getTime() + 1000),
            },
            periodType,
        },
    });

    if (existing) {
        // Update existing record
        await prisma.kPIRecord.update({
            where: { id: existing.id },
            data: {
                totalTasks: metrics.totalTasks,
                completedTasks: metrics.completedTasks,
                onTimeTasks: metrics.onTimeTasks,
                failedTasks: metrics.failedTasks,
                totalTimeSpent: metrics.totalTimeSpent,
                averageTimeSpent: metrics.averageTimeSpent,
                completionRate: metrics.completionRate,
                onTimeRate: metrics.onTimeRate,
                tasksPerDay: metrics.tasksPerDay,
                qualityScore: metrics.qualityScore,
            },
        });
    } else {
        // Create new record
        await prisma.kPIRecord.create({
            data: {
                technicianUserId: technicianId,
                periodStart,
                periodEnd,
                periodType,
                totalTasks: metrics.totalTasks,
                completedTasks: metrics.completedTasks,
                onTimeTasks: metrics.onTimeTasks,
                failedTasks: metrics.failedTasks,
                totalTimeSpent: metrics.totalTimeSpent,
                averageTimeSpent: metrics.averageTimeSpent,
                completionRate: metrics.completionRate,
                onTimeRate: metrics.onTimeRate,
                tasksPerDay: metrics.tasksPerDay,
                qualityScore: metrics.qualityScore,
            },
        });
    }
}

/**
 * Calculate KPI for all technicians for a specific period
 */
export async function calculateKPIForAllTechnicians(
    periodStart: Date,
    periodEnd: Date,
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY'
): Promise<void> {
    const technicians = await prisma.user.findMany({
        where: {
            role: 'TECHNICIAN' as const,
            status: 'ACTIVE',
        },
    });

    for (const technician of technicians) {
        try {
            await calculateAndSaveKPI(
                technician.id,
                periodStart,
                periodEnd,
                periodType
            );
        } catch (error) {
            console.error(`Error calculating KPI for technician ${technician.id}:`, error);
        }
    }
}
