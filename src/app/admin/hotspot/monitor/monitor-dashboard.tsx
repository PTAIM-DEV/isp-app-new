'use client';

import { useState, useEffect } from 'react';
import { Activity, Wifi, Clock, X } from 'lucide-react';

interface Session {
  id: string;
  username: string;
  macAddress: string | null;
  ipAddress: string | null;
  startTime: Date;
  duration: number | null;
  bytesIn: bigint | null;
  bytesOut: bigint | null;
  server: {
    name: string;
  };
  voucher: {
    code: string;
  } | null;
}

interface MonitorDashboardProps {
  initialSessions: Session[];
}

export default function MonitorDashboard({ initialSessions }: MonitorDashboardProps) {
  const [sessions, setSessions] = useState(initialSessions);
  const [isLoading, setIsLoading] = useState(false);

  const formatBytes = (bytes: bigint | null) => {
    if (!bytes) return '0 B';
    const b = Number(bytes);
    if (b === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(b) / Math.log(k));
    return Math.round(b / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const syncSessions = async () => {
    setIsLoading(true);
    try {
      // Use the new cron endpoint which also updates voucher status
      const response = await fetch('/api/cron/sync-hotspot-sessions', {
        method: 'GET'
      });

      const data = await response.json();
      
      if (data.success) {
        // Reload sessions
        const sessionsRes = await fetch('/api/admin/hotspot/sessions?status=ACTIVE');
        const sessionsData = await sessionsRes.json();
        setSessions(sessionsData.sessions || []);
        
        // Show success message
        alert(`Sync berhasil! ${data.sessionsSynced || 0} sessions di-sync, ${data.vouchersUpdated || 0} vouchers di-update.`);
      } else {
        alert(`Sync gagal: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Error syncing sessions:', error);
      alert(`Error: ${error.message || 'Failed to sync sessions'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectSession = async (sessionId: string) => {
    if (!confirm('Disconnect session ini?')) return;

    try {
      const response = await fetch(`/api/admin/hotspot/sessions/${sessionId}/disconnect`, {
        method: 'POST'
      });

      if (response.ok) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Error disconnecting session:', error);
      alert('Failed to disconnect session');
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      syncSessions();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Active Sessions</h3>
        <button
          onClick={syncSessions}
          disabled={isLoading}
          className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 disabled:opacity-50"
        >
          {isLoading ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Tidak ada session aktif</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Server
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MAC Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Start Time
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{session.username}</div>
                    {session.voucher && (
                      <div className="text-xs text-gray-500">Voucher: {session.voucher.code}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {session.server.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {session.ipAddress || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {session.macAddress || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDuration(session.duration)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>↓ {formatBytes(session.bytesIn)}</div>
                    <div>↑ {formatBytes(session.bytesOut)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(session.startTime).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => disconnectSession(session.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Disconnect"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


