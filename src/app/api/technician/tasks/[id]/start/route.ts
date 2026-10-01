import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

// POST /api/technician/tasks/[id]/start - Start a task
export async function POST(
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
        const body = await request.json();
        const { latitude, longitude } = body;

        // Try installation first
        const installation = await prisma.installation.findFirst({
            where: {
                id,
                technicianUserId: technicianId,
            }
        });

        if (installation) {
            await prisma.installation.update({
                where: { id },
                data: {
                    status: 'IN_PROGRESS',
                    startedDate: new Date(),
                    checkInLatitude: latitude || null,
                    checkInLongitude: longitude || null,
                    checkInTime: latitude && longitude ? new Date() : null,
                }
            });
            return NextResponse.json({ success: true });
        }

        // Try maintenance task
        const maintenanceTask = await prisma.maintenanceTask.findFirst({
            where: {
                id,
                technicianUserId: technicianId,
            }
        });

        if (maintenanceTask) {
            await prisma.maintenanceTask.update({
                where: { id },
                data: {
                    status: 'IN_PROGRESS',
                    startedDate: new Date(),
                    checkInLatitude: latitude || null,
                    checkInLongitude: longitude || null,
                    checkInTime: latitude && longitude ? new Date() : null,
                }
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json(
            { error: 'Task not found' },
            { status: 404 }
        );
    } catch (error: any) {
        console.error('Error starting task:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to start task' },
            { status: 500 }
        );
    }
}

