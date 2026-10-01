'use client';

import { useState, useEffect } from 'react';
import { Clock, Loader2, CheckCircle2, XCircle } from 'lucide-react';

interface SchedulerButtonProps {
  serverId: string;
}

export default function SchedulerButton({ serverId }: SchedulerButtonProps) {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    checkStatus();
  }, [serverId]);

  const checkStatus = async () => {
    try {
      const response = await fetch(`/api/admin/hotspot/servers/${serverId}/install-scheduler`);
      const data = await response.json();
      if (data.success) {
        setIsInstalled(data.installed);
      }
    } catch (error) {
      console.error('Error checking scheduler status:', error);
    }
  };

  const handleInstall = async () => {
    if (!confirm('Install scheduler untuk check expired vouchers setiap 5 detik?')) {
      return;
    }

    setIsInstalling(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/hotspot/servers/${serverId}/install-scheduler`, {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Scheduler berhasil diinstall!');
        setIsInstalled(true);
      } else {
        setMessage(`Error: ${data.error || 'Failed to install scheduler'}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message || 'Failed to install scheduler'}`);
    } finally {
      setIsInstalling(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Hapus scheduler? Voucher expiration check akan berhenti.')) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/hotspot/servers/${serverId}/install-scheduler`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setMessage('Scheduler berhasil dihapus!');
        setIsInstalled(false);
      } else {
        setMessage(`Error: ${data.error || 'Failed to remove scheduler'}`);
      }
    } catch (error: any) {
      setMessage(`Error: ${error.message || 'Failed to remove scheduler'}`);
    } finally {
      setIsLoading(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  if (isInstalled === null) {
    return (
      <div className="flex items-center text-sm text-gray-500">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Checking status...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-3">
        {isInstalled ? (
          <>
            <div className="flex items-center text-green-600">
              <CheckCircle2 className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Scheduler Installed</span>
            </div>
            <button
              onClick={handleRemove}
              disabled={isLoading}
              className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 inline animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove Scheduler'
              )}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center text-gray-600">
              <XCircle className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">Scheduler Not Installed</span>
            </div>
            <button
              onClick={handleInstall}
              disabled={isInstalling}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Installing...
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4 mr-1" />
                  Install Scheduler
                </>
              )}
            </button>
          </>
        )}
      </div>

      {message && (
        <div className={`text-xs p-2 rounded ${
          message.includes('Error') 
            ? 'bg-red-50 text-red-700' 
            : 'bg-green-50 text-green-700'
        }`}>
          {message}
        </div>
      )}

      <p className="text-xs text-gray-500">
        Scheduler akan check expired vouchers setiap 5 detik dan otomatis disconnect user yang expired.
      </p>
    </div>
  );
}






