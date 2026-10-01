import { prisma } from '@/lib/prisma';
import { KPIDashboard } from './kpi-dashboard';

export const dynamic = 'force-dynamic';

export default async function TechnicianKPIPage() {
    const technicians = await prisma.user.findMany({
        where: {
            role: 'TECHNICIAN',
            status: 'ACTIVE',
        },
        select: {
            id: true,
            name: true,
            phone: true,
            email: true,
        },
        orderBy: {
            name: 'asc',
        },
    });

    return <KPIDashboard technicians={technicians} />;
}

