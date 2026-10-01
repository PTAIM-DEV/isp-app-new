import Link from 'next/link';
import { Shield, List, AlertTriangle } from 'lucide-react';

export default function SecurityDashboardPage() {
    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Security Dashboard</h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Link href="/admin/security/logs" className="block">
                    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <List className="h-6 w-6 text-gray-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Access Logs</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900">View All</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>

                <Link href="/admin/security/blacklist" className="block">
                    <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
                        <div className="p-5">
                            <div className="flex items-center">
                                <div className="flex-shrink-0">
                                    <Shield className="h-6 w-6 text-red-400" />
                                </div>
                                <div className="ml-5 w-0 flex-1">
                                    <dl>
                                        <dt className="text-sm font-medium text-gray-500 truncate">Blacklisted IPs</dt>
                                        <dd>
                                            <div className="text-lg font-medium text-gray-900">Manage Blocks</div>
                                        </dd>
                                    </dl>
                                </div>
                            </div>
                        </div>
                    </div>
                </Link>
            </div>
        </div>
    );
}
