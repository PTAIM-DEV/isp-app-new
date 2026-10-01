import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendTaskAssignmentNotification, sendTaskUpdateNotification } from '@/lib/technician-notification';

export const dynamic = 'force-dynamic';

// GET /api/admin/technicians/tasks/[id] - Get single task
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Try installation first
        const installation = await prisma.installation.findUnique({
            where: { id },
            include: {
                technicianUser: true,
                user: {
                    include: {
                        province: true,
                        city: true,
                        district: true,
                        village: true,
                    }
                }
            }
        });

        if (installation) {
            return NextResponse.json({
                ...installation,
                type: 'INSTALLATION',
                customer: installation.user,
            });
        }

        // Try maintenance task
        const maintenanceTask = await prisma.maintenanceTask.findUnique({
            where: { id },
            include: {
                technicianUser: true,
                customer: {
                    include: {
                        province: true,
                        city: true,
                        district: true,
                        village: true,
                    }
                }
            }
        });

        if (maintenanceTask) {
            return NextResponse.json({
                ...maintenanceTask,
                type: 'MAINTENANCE',
            });
        }

        return NextResponse.json(
            { error: 'Task not found' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Error fetching task:', error);
        return NextResponse.json(
            { error: 'Failed to fetch task' },
            { status: 500 }
        );
    }
}

// PATCH /api/admin/technicians/tasks/[id] - Update task
export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { technicianId, scheduledDate, priority, status, notes, locationNotes } = body;

        // Try installation first
        const installation = await prisma.installation.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        name: true,
                        phone: true,
                        address: true,
                    }
                },
                technicianUser: {
                    select: {
                        id: true,
                    }
                }
            }
        });

        if (installation) {
            const oldTechnicianId = installation.technicianUserId;
            const oldScheduledDate = installation.scheduledDate;

            await prisma.installation.update({
                where: { id },
                data: {
                    ...(technicianId !== undefined && { technicianUserId: technicianId || null }),
                    ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
                    ...(priority && { priority }),
                    ...(status && { status }),
                    ...(notes !== undefined && { notes }),
                    ...(locationNotes !== undefined && { locationNotes }),
                }
            });

            // Send notification if technician assigned or changed
            if (technicianId && technicianId !== oldTechnicianId) {
                await sendTaskAssignmentNotification(technicianId, {
                    id: installation.id,
                    type: 'INSTALLATION',
                    scheduledDate: scheduledDate ? new Date(scheduledDate) : installation.scheduledDate || new Date(),
                    customer: {
                        name: installation.user.name,
                        phone: installation.user.phone,
                        address: installation.user.address || undefined,
                    },
                    priority: priority || installation.priority || 'NORMAL',
                    taskType: installation.taskType,
                    locationNotes: locationNotes !== undefined ? locationNotes : installation.locationNotes || undefined,
                }).catch(err => {
                    console.error('Failed to send task notification:', err);
                });
            } else if (scheduledDate && oldScheduledDate && new Date(scheduledDate).getTime() !== oldScheduledDate.getTime() && installation.technicianUserId) {
                // Rescheduled notification
                await sendTaskUpdateNotification(installation.technicianUserId!, {
                    id: installation.id,
                    type: 'INSTALLATION',
                    scheduledDate: new Date(scheduledDate),
                    status: status || installation.status,
                    customer: {
                        name: installation.user.name,
                    },
                }, 'RESCHEDULED').catch(err => {
                    console.error('Failed to send reschedule notification:', err);
                });
            }

            return NextResponse.json({ success: true });
        }

        // Try maintenance task
        const maintenanceTask = await prisma.maintenanceTask.findUnique({
            where: { id },
            include: {
                customer: {
                    select: {
                        name: true,
                        phone: true,
                        address: true,
                    }
                },
                technicianUser: {
                    select: {
                        id: true,
                    }
                }
            }
        });

        if (maintenanceTask) {
            const oldTechnicianId = maintenanceTask.technicianUserId;
            const oldScheduledDate = maintenanceTask.scheduledDate;

            await prisma.maintenanceTask.update({
                where: { id },
                data: {
                    ...(technicianId !== undefined && { technicianUserId: technicianId || null }),
                    ...(scheduledDate && { scheduledDate: new Date(scheduledDate) }),
                    ...(priority && { priority }),
                    ...(status && { status }),
                    ...(notes !== undefined && { description: notes }),
                    ...(locationNotes !== undefined && { locationNotes }),
                }
            });

            // Send notification if technician assigned or changed
            if (technicianId && technicianId !== oldTechnicianId) {
                await sendTaskAssignmentNotification(technicianId, {
                    id: maintenanceTask.id,
                    type: 'MAINTENANCE',
                    scheduledDate: scheduledDate ? new Date(scheduledDate) : maintenanceTask.scheduledDate,
                    customer: {
                        name: maintenanceTask.customer.name,
                        phone: maintenanceTask.customer.phone,
                        address: maintenanceTask.customer.address || undefined,
                    },
                    priority: priority || maintenanceTask.priority || 'NORMAL',
                    taskType: maintenanceTask.taskType,
                    locationNotes: locationNotes !== undefined ? locationNotes : maintenanceTask.locationNotes || undefined,
                }).catch(err => {
                    console.error('Failed to send task notification:', err);
                });
            } else if (scheduledDate && oldScheduledDate && new Date(scheduledDate).getTime() !== oldScheduledDate.getTime() && maintenanceTask.technicianUserId) {
                // Rescheduled notification
                await sendTaskUpdateNotification(maintenanceTask.technicianUserId!, {
                    id: maintenanceTask.id,
                    type: 'MAINTENANCE',
                    scheduledDate: new Date(scheduledDate),
                    status: status || maintenanceTask.status,
                    customer: {
                        name: maintenanceTask.customer.name,
                    },
                }, 'RESCHEDULED').catch(err => {
                    console.error('Failed to send reschedule notification:', err);
                });
            }

            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: 'Task not found' },
            { status: 404 }
        );
    } catch (error: any) {
        console.error('Error updating task:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to update task' },
            { status: 500 }
        );
    }
}

