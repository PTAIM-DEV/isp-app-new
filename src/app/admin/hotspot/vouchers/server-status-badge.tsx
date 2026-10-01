'use client';

import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface ServerStatus {
  id: string;
  name: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastConnected: Date | null;
  errorMessage: string | null;
}

interface ServerStatusBadgeProps {
  server: ServerStatus;
  showDetails?: boolean;
}

export function ServerStatusBadge({ server, showDetails = false }: ServerStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (server.connectionStatus) {
      case 'CONNECTED':
        return {
          icon: CheckCircle2,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Terhubung',
          textColor: 'text-green-700'
        };
      case 'ERROR':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Error',
          textColor: 'text-red-700'
        };
      case 'DISCONNECTED':
      default:
        return {
          icon: XCircle,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Terputus',
          textColor: 'text-gray-700'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatLastConnected = (date: Date | null) => {
    if (!date) return 'Belum pernah';
    
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes} menit lalu`;
    if (hours < 24) return `${hours} jam lalu`;
    return `${days} hari lalu`;
  };

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md border ${config.bgColor} ${config.borderColor}`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.textColor}`}>
        {config.label}
      </span>
      {showDetails && (
        <>
          {server.lastConnected && (
            <span className={`text-xs ${config.textColor} opacity-75`}>
              • {formatLastConnected(server.lastConnected)}
            </span>
          )}
          {server.errorMessage && server.connectionStatus === 'ERROR' && (
            <span className={`text-xs ${config.textColor} opacity-75`} title={server.errorMessage}>
              • {server.errorMessage.length > 30 
                ? server.errorMessage.substring(0, 30) + '...' 
                : server.errorMessage}
            </span>
          )}
        </>
      )}
    </div>
  );
}

