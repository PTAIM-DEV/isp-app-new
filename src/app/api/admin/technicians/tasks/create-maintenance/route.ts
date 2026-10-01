import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendTaskAssignmentNotification } from '@/lib/technician-notification';

export const dynamic = 'force-dynamic';

// POST /api/admin/technicians/tasks/create-maintenance - Create new maintenance task
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { customerId, technicianId, scheduledDate, taskType, priority, description, locationNotes, picName, picPhone, teamName } = body;

        if (!customerId || !scheduledDate) {
            return NextResponse.json(
                { error: 'Customer ID and scheduled date are required' },
                { status: 400 }
            );
        }

        // Verify customer exists
        const customer = await prisma.user.findUnique({
            where: { id: customerId }
        });

        if (!customer) {
            return NextResponse.json(
                { error: 'Customer not found' },
                { status: 404 }
            );
        }

        // Verify technician if provided
        if (technicianId) {
            const technician = await prisma.user.findFirst({
                where: {
                    id: technicianId,
                    role: 'TECHNICIAN' as const
                }
            });

            if (!technician || technician.status !== 'ACTIVE') {
                return NextResponse.json(
                    { error: 'Technician not found or inactive' },
                    { status: 400 }
                );
            }
        }

        const maintenanceTask = await prisma.maintenanceTask.create({
            data: {
                customerId,
                technicianUserId: technicianId || null,
                scheduledDate: new Date(scheduledDate),
                taskType: taskType || 'ROUTINE',
                priority: priority || 'NORMAL',
                description: description || null,
                locationNotes: locationNotes || null,
                status: 'PENDING',
                picName: picName || null,
                picPhone: picPhone || null,
                teamName: teamName || null,
            },
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

        // Send notification to technician if assigned
        if (technicianId) {
            await sendTaskAssignmentNotification(technicianId, {
                id: maintenanceTask.id,
                type: 'MAINTENANCE',
                scheduledDate: maintenanceTask.scheduledDate,
                customer: {
                    name: maintenanceTask.customer.name,
                    phone: maintenanceTask.customer.phone,
                    address: maintenanceTask.customer.address || undefined,
                },
                priority: maintenanceTask.priority,
                taskType: maintenanceTask.taskType,
                locationNotes: maintenanceTask.locationNotes || undefined,
            }).catch(err => {
                console.error('Failed to send task notification:', err);
                // Don't fail the request if notification fails
            });
        }

        return NextResponse.json(maintenanceTask, { status: 201 });
    } catch (error: any) {
        console.error('Error creating maintenance task:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create maintenance task' },
            { status: 500 }
        );
    }
}

