import { getUsers } from './actions';
import { User, Role } from '@prisma/client';
import Link from 'next/link';

// Simple Add User Component (Client Side logic would be better in separate file but for simplicity/speed putting form here or just listing)
// For a robust app, we'd use a Client Component for the form.
// I'll stick to a Server Component listing + a Link to "create" or a simple form if I make this file client or split it.
// Let's make a separate client component for the list functionality if needed, but for now simple server rendering.

// Actually, we need a Client Component to handle "Open Modal" or "Delete".
// Let's create `users-client.tsx` for the interactive parts? 
// Or just make page.tsx a server component and import a client component.
// I will create `user-list.tsx` (Client) to handle interactions.

import UserList from './user-list';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ q?: string; role?: string; status?: string }> }) {
    const params = await searchParams;
    const query = params.q || '';
    const role = params.role || '';
    const status = params.status || '';

    const users = await getUsers(query, role, status);

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">User Management</h1>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
                <UserList initialUsers={users} currentSearch={query} currentRole={role} currentStatus={status} />
            </div>
        </div>
    );
}
