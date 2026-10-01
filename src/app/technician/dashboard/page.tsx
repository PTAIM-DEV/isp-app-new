import { getCurrentTechnician } from '../login/actions';
import { redirect } from 'next/navigation';
import { TechnicianDashboardClient } from './dashboard-client';

export const dynamic = 'force-dynamic';

export default async function TechnicianDashboardPage() {
    const technician = await getCurrentTechnician();

    if (!technician) {
        redirect('/technician/login');
    }

    return <TechnicianDashboardClient technician={technician} />;
}


