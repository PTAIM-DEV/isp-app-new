import { getSession } from '@/lib/session';
import Sidebar from './sidebar';
import { getRolePermissions } from './settings/roles/actions';
import { Role } from '@prisma/client';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    // Determine path on server? Next.js Layout doesn't have access to pathname directly.
    // However, Sidebar (Client) DOES.
    // We just need to pass the Role to the Sidebar.

    // Auth Check is done in Middleware, but we fetch session here for UI
    const session = await getSession();
    const role = session?.role || 'GUEST';

    // Fetch dynamic permissions
    // We need to cast string role to Role enum, ensuring it matches
    const roleEnum = role as Role;
    const permissions = role !== 'GUEST' ? await getRolePermissions(roleEnum) : [];

    return (
        <div className="min-h-screen bg-gray-100">
            <div className="flex">
                <Sidebar role={role} permissions={permissions} />

                {/* Main Content */}
                <div className="flex-1 overflow-auto min-w-0">
                    <header className="bg-white shadow p-4 h-16 flex items-center justify-between sticky top-0 z-10">
                        <div className="flex items-center">
                            {/* Mobile menu trigger could go here */}
                        </div>

                        <div className="flex justify-end items-center space-x-4">
                            <span className="text-gray-600 text-sm">{session?.name || 'Admin User'}</span>
                            <span className="text-xs bg-gray-200 px-2 py-1 rounded">{role}</span>
                        </div>
                    </header>
                    <main className="p-6">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}

