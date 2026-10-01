import { getCurrentTechnician } from '../../login/actions';
import { redirect } from 'next/navigation';
import { TaskDetailClient } from './task-detail-client';

export const dynamic = 'force-dynamic';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TaskDetailPage({ params }: PageProps) {
    const { id } = await params;
    const technician = await getCurrentTechnician();

    if (!technician) {
        redirect('/technician/login');
    }

    return <TaskDetailClient taskId={id} technician={technician} />;
}

