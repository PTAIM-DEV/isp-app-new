import { getCurrentTechnician } from '../login/actions';
import { redirect } from 'next/navigation';
import { TechnicianScheduleClient } from './schedule-client';

export const dynamic = 'force-dynamic';

export default async function TechnicianSchedulePage() {
    const technician = await getCurrentTechnician();

    if (!technician) {
        redirect('/technician/login');
    }

    return <TechnicianScheduleClient technician={technician} />;
}

