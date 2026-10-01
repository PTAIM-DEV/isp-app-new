import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendTaskAssignmentNotification, sendTaskUpdateNotification } from '@/lib/technician-notification';

export const dynamic = 'force-dynamic';

// GET /api/admin/technicians/tasks - Get all tasks (installations + maintenance)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const technicianId = searchParams.get('technicianId');
        const status = searchParams.get('status');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const taskType = searchParams.get('taskType');

        // Build where clause for installations
        const installationWhere: any = {};
        if (technicianId) installationWhere.technicianUserId = technicianId;
        if (status) installationWhere.status = status;
        if (startDate || endDate) {
            installationWhere.scheduledDate = {};
            if (startDate) installationWhere.scheduledDate.gte = new Date(startDate);
            if (endDate) installationWhere.scheduledDate.lte = new Date(endDate);
        }
        if (taskType) installationWhere.taskType = taskType;

        // Build where clause for maintenance tasks
        const maintenanceWhere: any = {};
        if (technicianId) maintenanceWhere.technicianUserId = technicianId;
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
                technicianUser: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    }
                },
                user: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        address: true,
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
                technicianUser: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                    }
                },
                customer: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        address: true,
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
                technician: inst.technicianUser, // Map technicianUser to technician
                customer: inst.user,
                notes: inst.notes,
                locationNotes: inst.locationNotes,
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
                technician: mt.technicianUser, // Map technicianUser to technician
                customer: mt.customer,
                notes: mt.description,
                locationNotes: mt.locationNotes,
            }))
        ].sort((a, b) => {
            if (!a.scheduledDate) return 1;
            if (!b.scheduledDate) return -1;
            return new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime();
        });

        return NextResponse.json(tasks);
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch tasks' },
            { status: 500 }
        );
    }
}

// POST /api/admin/technicians/tasks - Assign task to technician
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { taskId, taskType, technicianId, scheduledDate, priority, notes, locationNotes } = body;

        if (!taskId || !taskType || !technicianId || !scheduledDate) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Verify technician exists and is active
        const technician = await prisma.user.findFirst({
            where: {
                id: technicianId,
                role: 'TECHNICIAN'
            }
        });

        if (!technician || (technician.status !== 'ACTIVE' && technician.status !== 'ON_LEAVE')) { // Allow ON_LEAVE? Probably not inactive.
            if (technician?.status === 'INACTIVE') {
                return NextResponse.json(
                    { error: 'Technician is inactive' },
                    { status: 400 }
                );
            }
            // If not found
            if (!technician) {
                return NextResponse.json(
                    { error: 'Technician not found' },
                    { status: 400 }
                );
            }
        }

        let taskData: any = null;
        let customerData: any = null;

        if (taskType === 'INSTALLATION') {
            const installation = await prisma.installation.update({
                where: { id: taskId },
                data: {
                    technicianUserId: technicianId, // Update new relation
                    // technicianId: null, // Optionally clear old relation, or leave it. Leaving it is safer for rollback but might be confusing. 
                    // Let's just update technicianUserId.
                    scheduledDate: new Date(scheduledDate),
                    priority: priority || 'NORMAL',
                    notes: notes || null,
                    locationNotes: locationNotes || null,
                    status: 'PENDING',
                },
                include: {
                    user: {
                        select: {
                            name: true,
                            phone: true,
                            address: true,
                        }
                    }
                }
            });
            taskData = installation;
            customerData = installation.user;
        } else if (taskType === 'MAINTENANCE') {
            const maintenanceTask = await prisma.maintenanceTask.update({
                where: { id: taskId },
                data: {
                    technicianUserId: technicianId, // Update new relation
                    scheduledDate: new Date(scheduledDate),
                    priority: priority || 'NORMAL',
                    description: notes || null,
                    locationNotes: locationNotes || null,
                    status: 'PENDING',
                },
                include: {
                    customer: {
                        select: {
                            name: true,
                            phone: true,
                            address: true,
                        }
                    }
                }
            });
            taskData = maintenanceTask;
            customerData = maintenanceTask.customer;
        } else {
            return NextResponse.json(
                { error: 'Invalid task type' },
                { status: 400 }
            );
        }

        // Send notification to technician
        if (taskData && customerData) {
            await sendTaskAssignmentNotification(technicianId, {
                id: taskData.id,
                type: taskType as 'INSTALLATION' | 'MAINTENANCE',
                scheduledDate: new Date(scheduledDate),
                customer: {
                    name: customerData.name,
                    phone: customerData.phone,
                    address: customerData.address || undefined,
                },
                priority: priority || 'NORMAL',
                taskType: taskData.taskType,
                locationNotes: locationNotes || undefined,
            }).catch(err => {
                console.error('Failed to send task notification:', err);
                // Don't fail the request if notification fails
            });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error assigning task:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to assign task' },
            { status: 500 }
        );
    }
}

