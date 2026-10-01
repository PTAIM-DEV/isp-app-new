import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// GET /api/technician/tasks/[id] - Get single task for technician
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;

        // Try installation first
        const installation = await prisma.installation.findFirst({
            where: {
                id,
                technicianUserId: technicianId,
            },
            include: {
                user: {
                    include: {
                        province: true,
                        city: true,
                        district: true,
                        village: true,
                        subscription: true,
                    }
                }
            }
        });

        if (installation) {
            return NextResponse.json({
                ...installation,
                type: 'INSTALLATION',
                customer: installation.user,
                picName: installation.picName || installation.user.name,
                picPhone: installation.picPhone || installation.user.phone,
                teamName: installation.teamName,
            });
        }

        // Try maintenance task
        const maintenanceTask = await prisma.maintenanceTask.findFirst({
            where: {
                id,
                technicianUserId: technicianId,
            },
            include: {
                customer: {
                    include: {
                        province: true,
                        city: true,
                        district: true,
                        village: true,
                        subscription: true,
                    }
                }
            }
        });

        if (maintenanceTask) {
            return NextResponse.json({
                ...maintenanceTask,
                type: 'MAINTENANCE',
                picName: maintenanceTask.picName || maintenanceTask.customer.name, // Fallback to customer name
                picPhone: maintenanceTask.picPhone || maintenanceTask.customer.phone,
                teamName: maintenanceTask.teamName,
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

