import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { TechnicianKPIClient } from './kpi-client';

export const dynamic = 'force-dynamic';

export default async function TechnicianKPIPage() {
    // Get current technician from session
    const cookieStore = await cookies();
    const session = cookieStore.get('technician_session');

    if (!session) {
        redirect('/technician/login');
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
        redirect('/technician/login');
    }

    const technician = await prisma.user.findUnique({
        where: { id: technicianId },
        select: {
            id: true,
            name: true,
            phone: true,
            email: true,
        },
    });

    if (!technician) {
        redirect('/technician/login');
    }

    return <TechnicianKPIClient technician={technician} />;
}

