import { prisma } from '@/lib/prisma';
import { Wifi, Server, Users, Activity } from 'lucide-react';
import MonitorDashboard from './monitor-dashboard';

export const dynamic = 'force-dynamic';

export default async function MonitorPage() {
  const servers = await prisma.mikrotikServer.findMany({
    where: { isActive: true },
    include: {
      _count: {
        select: {
          sessions: {
            where: {
              status: 'ACTIVE'
            }
          },
          vouchers: true,
          users: true
        }
      }
    },
    orderBy: { name: 'asc' }
  });

  // Get recent active sessions
  const recentSessions = await prisma.hotspotSession.findMany({
    where: {
      status: 'ACTIVE'
    },
    include: {
      server: {
        select: {
          id: true,
          name: true
        }
      },
      voucher: {
        select: {
          code: true
        }
      }
    },
    orderBy: {
      startTime: 'desc'
    },
    take: 20
  });

  // Calculate total stats
  const totalActiveSessions = recentSessions.length;
  const totalServers = servers.length;
  const totalVouchers = servers.reduce((sum, s) => sum + s._count.vouchers, 0);
  const totalUsers = servers.reduce((sum, s) => sum + s._count.users, 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Hotspot Monitor</h2>
        <p className="text-gray-500 mt-1">Monitor aktivitas hotspot real-time</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Sessions</p>
              <p className="text-2xl font-bold text-indigo-600">{totalActiveSessions}</p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <Activity className="w-6 h-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Servers</p>
              <p className="text-2xl font-bold text-green-600">{totalServers}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Server className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Vouchers</p>
              <p className="text-2xl font-bold text-blue-600">{totalVouchers}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <Wifi className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Users</p>
              <p className="text-2xl font-bold text-purple-600">{totalUsers}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Server Status */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Server Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {servers.map((server) => (
            <div key={server.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{server.name}</h4>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  server.connectionStatus === 'CONNECTED' 
                    ? 'bg-green-100 text-green-800'
                    : server.connectionStatus === 'ERROR'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {server.connectionStatus}
                </span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Active Sessions: {server._count.sessions}</div>
                <div>Vouchers: {server._count.vouchers}</div>
                <div>Users: {server._count.users}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Sessions */}
      <MonitorDashboard initialSessions={recentSessions} />
    </div>
  );
}


