import { prisma } from '@/lib/prisma';
import { ScheduleCalendar } from './schedule-calendar';
import { ScheduleList } from './schedule-list';

export const dynamic = 'force-dynamic';

export default async function ScheduleManagementPage() {
    const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN', status: 'ACTIVE' },
        orderBy: { name: 'asc' },
    });

    const customers = await prisma.user.findMany({
        where: {
            role: 'CUSTOMER',
            status: { in: ['ACTIVE', 'INSTALLED', 'PENDING_INSTALL'] }
        },
        select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            subscription: {
                select: {
                    planName: true
                }
            }
        },
        orderBy: { name: 'asc' },
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Manajemen Jadwal</h2>
            </div>

            <ScheduleCalendar technicians={technicians} customers={customers} />
        </div>
    );
}

