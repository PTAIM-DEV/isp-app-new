import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/technician/tasks - Get tasks for current technician
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
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        // Build where clause for installations
        const installationWhere: any = {
            technicianUserId: technicianId,
        };
        if (status) installationWhere.status = status;
        if (startDate || endDate) {
            installationWhere.scheduledDate = {};
            if (startDate) installationWhere.scheduledDate.gte = new Date(startDate);
            if (endDate) installationWhere.scheduledDate.lte = new Date(endDate);
        }

        // Build where clause for maintenance tasks
        const maintenanceWhere: any = {
            technicianUserId: technicianId,
        };
        if (status) maintenanceWhere.status = status;
        if (startDate || endDate) {
            maintenanceWhere.scheduledDate = {};
            if (startDate) maintenanceWhere.scheduledDate.gte = new Date(startDate);
            if (endDate) maintenanceWhere.scheduledDate.lte = new Date(endDate);
        }

        // Fetch installations
        const installations = await prisma.installation.findMany({
            where: installationWhere,
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        address: true,
                        latitude: true,
                        longitude: true,
                        province: { select: { name: true } },
                        city: { select: { name: true } },
                        district: { select: { name: true } },
                        village: { select: { name: true } },
                    }
                }
            },
            orderBy: { scheduledDate: 'asc' }
        });

        // Fetch maintenance tasks
        const maintenanceTasks = await prisma.maintenanceTask.findMany({
            where: maintenanceWhere,
            include: {
                customer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        address: true,
                        latitude: true,
                        longitude: true,
                        province: { select: { name: true } },
                        city: { select: { name: true } },
                        district: { select: { name: true } },
                        village: { select: { name: true } },
                    }
                }
            },
            orderBy: { scheduledDate: 'asc' }
        });

        // Transform to unified format
        const tasks = [
            ...installations.map(inst => ({
                id: inst.id,
                type: 'INSTALLATION' as const,
                scheduledDate: inst.scheduledDate,
                startedDate: inst.startedDate,
                completedDate: inst.completedDate,
                status: inst.status,
                priority: inst.priority,
                taskType: inst.taskType,
                customer: inst.user,
                notes: inst.notes,
                locationNotes: inst.locationNotes,
                checkInLatitude: inst.checkInLatitude,
                checkInLongitude: inst.checkInLongitude,
                checkInTime: inst.checkInTime,
            })),
            ...maintenanceTasks.map(mt => ({
                id: mt.id,
                type: 'MAINTENANCE' as const,
                scheduledDate: mt.scheduledDate,
                startedDate: mt.startedDate,
                completedDate: mt.completedDate,
                status: mt.status,
                priority: mt.priority,
                taskType: mt.taskType,
                customer: mt.customer,
                notes: mt.description,
                locationNotes: mt.locationNotes,
                checkInLatitude: mt.checkInLatitude,
                checkInLongitude: mt.checkInLongitude,
                checkInTime: mt.checkInTime,
            }))
        ].sort((a, b) => {
            if (!a.scheduledDate) return 1;
            if (!b.scheduledDate) return -1;
            return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Error fetching technician tasks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tasks' },
            { status: 500 }
        );
    }
}

