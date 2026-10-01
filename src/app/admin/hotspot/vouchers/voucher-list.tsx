'use client';

import Link from 'next/link';
import { Wifi, Copy, Send, Trash2, Eye, RefreshCw, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ServerStatusBadge } from './server-status-badge';

interface Voucher {
  id: string;
  code: string;
  username: string | null;
  password: string | null;
  status: string;
  price: number;
  createdAt: Date;
  syncedToMikrotik: boolean;
  mikrotikUserId: string | null;
  syncedAt: Date | null;
  server: {
    id: string;
    name: string;
  };
  package: {
    id: string;
    name: string;
    duration: number;
  } | null;
  resellerUser: {
    id: string;
    name: string;
  } | null;
  _count: {
    sessions: number;
  };
}

interface ServerStatus {
  id: string;
  name: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastConnected: Date | null;
  errorMessage: string | null;
}

interface VoucherListProps {
  vouchers: Voucher[];
  total: number;
  page: number;
  limit: number;
  servers: Array<{ id: string; name: string }>;
  serverStatuses: ServerStatus[];
  selectedServerId?: string;
}

export default function VoucherList({ vouchers, total, page, limit, servers, serverStatuses, selectedServerId }: VoucherListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>(selectedServerId || 'all');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [syncingVoucher, setSyncingVoucher] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<Record<string, { success: boolean; message: string }>>({});
  const [showWhatsAppModal, setShowWhatsAppModal] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
  const [whatsAppStatus, setWhatsAppStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [deletingVoucher, setDeletingVoucher] = useState<string | null>(null);
  const [selectedVouchers, setSelectedVouchers] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [autoSyncing, setAutoSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const isSyncingRef = useRef(false); // Ref untuk prevent multiple syncs

  // Auto-sync status setiap 30 detik
  useEffect(() => {
    const syncStatus = async () => {
      // Skip if already syncing (gunakan ref untuk prevent race condition)
      if (isSyncingRef.current) {
        console.log('[AUTO SYNC] Skip - sync already in progress');
        return;
      }
      
      isSyncingRef.current = true;
      setAutoSyncing(true);
      
      try {
        // Tambahkan timeout untuk fetch request (60 detik)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        const response = await fetch('/api/admin/hotspot/vouchers/sync-status', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          console.log('[AUTO SYNC] Status updated:', data);
          setLastSyncTime(new Date());
          // Force refresh dengan timestamp untuk bypass cache
          // Tambahkan small delay untuk memastikan database sudah ter-update
          setTimeout(() => {
            router.refresh();
          }, 500);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.warn('[AUTO SYNC] Sync failed:', response.status, errorData);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn('[AUTO SYNC] Sync timeout after 60 seconds');
        } else {
          console.error('[AUTO SYNC] Error:', error);
        }
      } finally {
        isSyncingRef.current = false;
        setAutoSyncing(false);
      }
    };

    // Sync immediately on mount (hanya sekali)
    syncStatus();

    // Set interval untuk sync setiap 30 detik
    const interval = setInterval(syncStatus, 30000);

    // Listen untuk manual sync trigger
    const handleManualSync = () => {
      syncStatus();
    };
    window.addEventListener('manual-sync', handleManualSync);

    // Cleanup interval saat component unmount
    return () => {
      clearInterval(interval);
      window.removeEventListener('manual-sync', handleManualSync);
      isSyncingRef.current = false; // Reset ref on unmount
    };
  }, [router]); // Hapus autoSyncing dari dependency untuk prevent loop

  // Get server status map
  const serverStatusMap = serverStatuses.reduce((acc, status) => {
    acc[status.id] = status;
    return acc;
  }, {} as Record<string, ServerStatus>);

  // Count vouchers per server (for display in tabs)
  const vouchersByServer = vouchers.reduce((acc, voucher) => {
    const serverId = voucher.server.id;
    acc[serverId] = (acc[serverId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Update active tab when selectedServerId changes
  useEffect(() => {
    if (selectedServerId) {
      setActiveTab(selectedServerId);
    } else {
      setActiveTab('all');
    }
  }, [selectedServerId]);

  const handleTabChange = (serverId: string) => {
    // Update URL and reload page (server-side filtering)
    const params = new URLSearchParams(searchParams.toString());
    if (serverId === 'all') {
      params.delete('serverId');
    } else {
      params.set('serverId', serverId);
    }
    params.set('page', '1'); // Reset to page 1 when changing tab
    router.push(`/admin/hotspot/vouchers?${params.toString()}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UNUSED':
        return 'bg-gray-100 text-gray-800';
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'USED':
        return 'bg-blue-100 text-blue-800';
      case 'EXPIRED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSyncVoucher = async (voucherId: string) => {
    setSyncingVoucher(voucherId);
    setSyncStatus(prev => ({ ...prev, [voucherId]: { success: false, message: 'Syncing...' } }));

    try {
      // Add timeout untuk fetch (45 detik untuk sync dengan profile creation)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      const response = await fetch(`/api/admin/hotspot/vouchers/${voucherId}/sync`, {
        method: 'POST',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Response is HTML (error page)
        const text = await response.text();
        throw new Error(`Server returned HTML instead of JSON (Status: ${response.status}). This usually means a timeout or server error.`);
      }

      const data = await response.json();

      if (response.ok && data.success) {
        setSyncStatus(prev => ({ 
          ...prev, 
          [voucherId]: { success: true, message: 'Synced successfully!' } 
        }));
        // Reload page after 1 second to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setSyncStatus(prev => ({ 
          ...prev, 
          [voucherId]: { success: false, message: data.error || data.details || 'Sync failed' } 
        }));
      }
    } catch (error: any) {
      let errorMessage = 'Sync failed';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout: Sync took too long. Please check MikroTik server connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      setSyncStatus(prev => ({ 
        ...prev, 
        [voucherId]: { success: false, message: errorMessage } 
      }));
    } finally {
      setSyncingVoucher(null);
    }
  };

  const handleSendWhatsApp = async (voucherId: string) => {
    if (!phoneNumber.trim()) {
      setWhatsAppStatus({ success: false, message: 'Nomor WhatsApp harus diisi' });
      return;
    }

    setSendingWhatsApp(true);
    setWhatsAppStatus(null);

    try {
      const response = await fetch(`/api/admin/hotspot/vouchers/${voucherId}/send-whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setWhatsAppStatus({ success: true, message: 'Voucher berhasil dikirim via WhatsApp!' });
        setPhoneNumber('');
        // Reload page after 2 seconds to show updated status
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setWhatsAppStatus({ success: false, message: data.error || 'Gagal mengirim voucher' });
      }
    } catch (error: any) {
      setWhatsAppStatus({ success: false, message: error.message || 'Gagal mengirim voucher' });
    } finally {
      setSendingWhatsApp(false);
    }
  };

  const handleDeleteVoucher = async (voucherId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus voucher ini?\n\nVoucher dengan sesi aktif atau penjualan tidak dapat dihapus.')) {
      return;
    }

    setDeletingVoucher(voucherId);

    try {
      // Add timeout untuk prevent 504 (30 detik)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`/api/admin/hotspot/vouchers/${voucherId}`, {
        method: 'DELETE',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Response is HTML (error page)
        const text = await response.text();
        let errorMessage = `Server mengembalikan halaman HTML (Status: ${response.status}).`;
        
        if (response.status === 504) {
          errorMessage += '\n\nTimeout: Koneksi ke server MikroTik terlalu lama atau server tidak merespons. Voucher mungkin sudah dihapus dari database. Silakan refresh halaman.';
        } else if (response.status === 500) {
          errorMessage += '\n\nServer error: Terjadi kesalahan di server. Silakan coba lagi atau hubungi administrator.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Voucher berhasil dihapus');
        router.refresh();
      } else {
        alert(`Gagal menghapus voucher: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      let errorMessage = 'Gagal menghapus voucher';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout: Proses penghapusan terlalu lama. Server MikroTik mungkin tidak merespons. Voucher mungkin sudah dihapus dari database. Silakan refresh halaman.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      console.error('Delete voucher error:', error);
    } finally {
      setDeletingVoucher(null);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedVouchers(new Set(vouchers.map(v => v.id)));
    } else {
      setSelectedVouchers(new Set());
    }
  };

  const handleSelectVoucher = (voucherId: string, checked: boolean) => {
    const newSelected = new Set(selectedVouchers);
    if (checked) {
      newSelected.add(voucherId);
    } else {
      newSelected.delete(voucherId);
    }
    setSelectedVouchers(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedVouchers.size === 0) {
      alert('Pilih voucher yang ingin dihapus terlebih dahulu');
      return;
    }

    if (!confirm(`Apakah Anda yakin ingin menghapus ${selectedVouchers.size} voucher?\n\nVoucher dengan sesi aktif atau penjualan tidak dapat dihapus.`)) {
      return;
    }

    setBulkDeleting(true);

    try {
      // Add timeout untuk prevent 504 (60 detik untuk bulk delete)
      const controller = new AbortController();
      const timeoutMs = 60000; // 60 seconds for bulk operations
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch('/api/admin/hotspot/vouchers/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedVouchers) }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Response is HTML (error page)
        const text = await response.text();
        let errorMessage = `Server mengembalikan halaman HTML (Status: ${response.status}).`;
        
        if (response.status === 504) {
          errorMessage += '\n\nTimeout: Proses bulk delete terlalu lama. Beberapa voucher mungkin sudah dihapus. Silakan refresh halaman dan coba lagi dengan jumlah lebih sedikit.';
        } else if (response.status === 500) {
          errorMessage += '\n\nServer error: Terjadi kesalahan di server. Silakan coba lagi atau hubungi administrator.';
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (response.ok && data.success) {
        let message = `Berhasil menghapus ${data.deletedCount} voucher`;
        if (data.failedCount > 0) {
          message += `, ${data.failedCount} gagal`;
          if (data.errors && data.errors.length > 0) {
            message += `\n\nError:\n${data.errors.slice(0, 5).join('\n')}`;
            if (data.errors.length > 5) {
              message += `\n... dan ${data.errors.length - 5} error lainnya`;
            }
          }
        }
        alert(message);
        setSelectedVouchers(new Set());
        router.refresh();
      } else {
        alert(`Gagal menghapus voucher: ${data.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      let errorMessage = 'Gagal menghapus voucher';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout: Proses bulk delete terlalu lama. Beberapa voucher mungkin sudah dihapus. Silakan refresh halaman dan coba lagi dengan jumlah lebih sedikit.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
      console.error('Bulk delete error:', error);
    } finally {
      setBulkDeleting(false);
    }
  };

  // Use total from server (already filtered by serverId if tab is selected)
  // Note: filteredVouchers is for client-side display only
  const totalPages = Math.ceil(total / limit);

  if (vouchers.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <Wifi className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada voucher</h3>
        <p className="text-gray-500 mb-4">Belum ada voucher yang dibuat.</p>
        <Link
          href="/admin/hotspot/vouchers/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Buat Voucher Pertama
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => {
                setShowWhatsAppModal(null);
                setPhoneNumber('');
                setWhatsAppStatus(null);
              }}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Kirim Voucher via WhatsApp
                  </h3>
                  <button
                    onClick={() => {
                      setShowWhatsAppModal(null);
                      setPhoneNumber('');
                      setWhatsAppStatus(null);
                    }}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="bg-white px-6 py-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="081234567890 atau 6281234567890"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    disabled={sendingWhatsApp}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Format: 081234567890 atau 6281234567890
                  </p>
                </div>

                {whatsAppStatus && (
                  <div className={`mb-4 p-3 rounded-md ${
                    whatsAppStatus.success 
                      ? 'bg-green-50 border border-green-200 text-green-700' 
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {whatsAppStatus.message}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowWhatsAppModal(null);
                      setPhoneNumber('');
                      setWhatsAppStatus(null);
                    }}
                    disabled={sendingWhatsApp}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => handleSendWhatsApp(showWhatsAppModal)}
                    disabled={sendingWhatsApp || !phoneNumber.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center"
                  >
                    {sendingWhatsApp ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Mengirim...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Kirim
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Sync Status Indicator */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {autoSyncing ? (
            <>
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-sm text-blue-700">Menyinkronkan status voucher...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                Auto-sync setiap 30 detik
                {lastSyncTime && (
                  <span className="text-blue-600 ml-2">
                    (Terakhir: {lastSyncTime.toLocaleTimeString('id-ID')})
                  </span>
                )}
              </span>
            </>
          )}
        </div>
        {!autoSyncing && (
          <button
            onClick={() => {
              // Trigger manual sync
              const event = new Event('manual-sync');
              window.dispatchEvent(event);
              // Force refresh
              router.refresh();
            }}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
            disabled={autoSyncing}
          >
            Refresh Sekarang
          </button>
        )}
      </div>

      {/* Server Tabs */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => handleTabChange('all')}
              className={`
                px-6 py-4 text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'all'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Semua Voucher
              <span className="ml-2 text-xs text-gray-400">({total})</span>
            </button>
            {servers.map((server) => {
              const serverStatus = serverStatusMap[server.id];
              const serverVoucherCount = vouchersByServer[server.id] || 0;
              
              return (
                <button
                  key={server.id}
                  onClick={() => handleTabChange(server.id)}
                  className={`
                    px-6 py-4 text-sm font-medium border-b-2 transition-colors flex items-center gap-2
                    ${activeTab === server.id
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <span>{server.name}</span>
                  {serverStatus && (
                    <ServerStatusBadge server={serverStatus} showDetails={false} />
                  )}
                  <span className="text-xs text-gray-400">({serverVoucherCount})</span>
                </button>
              );
            })}
          </nav>
        </div>
        
        {/* Server Status Info for Active Tab */}
        {activeTab !== 'all' && serverStatusMap[activeTab] && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ServerStatusBadge server={serverStatusMap[activeTab]} showDetails={true} />
              </div>
              {serverStatusMap[activeTab].connectionStatus !== 'CONNECTED' && (
                <span className="text-xs text-gray-600">
                  Server tidak dapat dihubungi. Beberapa fitur mungkin tidak tersedia.
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Bulk Actions */}
        {selectedVouchers.size > 0 && (
          <div className="bg-indigo-50 border-b border-indigo-200 px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-indigo-900">
              {selectedVouchers.size} voucher dipilih
            </span>
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Menghapus...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Hapus {selectedVouchers.size} Voucher
                </>
              )}
            </button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedVouchers.size === vouchers.length && vouchers.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kode Voucher
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Server
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paket
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Harga
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sync Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reseller
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dibuat
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {vouchers.map((voucher) => (
                <tr key={voucher.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedVouchers.has(voucher.id)}
                      onChange={(e) => handleSelectVoucher(voucher.id, e.target.checked)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="font-mono font-semibold text-sm">{voucher.code}</span>
                      <button
                        onClick={() => copyToClipboard(voucher.code)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {copiedCode === voucher.code && (
                        <span className="ml-2 text-xs text-green-600">Copied!</span>
                      )}
                    </div>
                    {voucher.username && (
                      <div className="text-xs text-gray-500 mt-1">
                        User: {voucher.username}
                        {voucher.password && ` / Pass: ${voucher.password}`}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {voucher.server.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {voucher.package ? (
                      <div>
                        <div>{voucher.package.name}</div>
                        <div className="text-xs text-gray-500">{voucher.package.duration} menit</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    Rp {Number(voucher.price).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(voucher.status)}`}>
                      {voucher.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {voucher.syncedToMikrotik ? (
                      <div className="flex items-center">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-xs text-green-600 font-medium">Synced</span>
                        {voucher.syncedAt && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({new Date(voucher.syncedAt).toLocaleDateString('id-ID')})
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-4 h-4 text-orange-600 mr-1" />
                        <span className="text-xs text-orange-600 font-medium">Not Synced</span>
                        <button
                          onClick={() => handleSyncVoucher(voucher.id)}
                          disabled={syncingVoucher === voucher.id}
                          className="ml-2 inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Sync to MikroTik"
                        >
                          {syncingVoucher === voucher.id ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Sync
                            </>
                          )}
                        </button>
                      </div>
                    )}
                    {syncStatus[voucher.id] && (
                      <div className={`text-xs mt-1 ${syncStatus[voucher.id].success ? 'text-green-600' : 'text-red-600'}`}>
                        {syncStatus[voucher.id].message}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {voucher.resellerUser ? voucher.resellerUser.name : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(voucher.createdAt).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/admin/hotspot/vouchers/${voucher.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => setShowWhatsAppModal(voucher.id)}
                        className="text-green-600 hover:text-green-900"
                        title="Send via WhatsApp"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteVoucher(voucher.id)}
                        disabled={deletingVoucher === voucher.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete"
                      >
                        {deletingVoucher === voucher.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              {page > 1 && (
                <Link
                  href={`?page=${page - 1}${activeTab !== 'all' ? `&serverId=${activeTab}` : ''}`}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`?page=${page + 1}${activeTab !== 'all' ? `&serverId=${activeTab}` : ''}`}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Next
                </Link>
              )}
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Menampilkan <span className="font-medium">{(page - 1) * limit + 1}</span> sampai{' '}
                  <span className="font-medium">{Math.min(page * limit, total)}</span> dari{' '}
                  <span className="font-medium">{total}</span> voucher
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {page > 1 && (
                    <Link
                      href={`?page=${page - 1}`}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Previous
                    </Link>
                  )}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={`?page=${p}${activeTab !== 'all' ? `&serverId=${activeTab}` : ''}`}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        p === page
                          ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {p}
                    </Link>
                  ))}
                  {page < totalPages && (
                    <Link
                      href={`?page=${page + 1}${activeTab !== 'all' ? `&serverId=${activeTab}` : ''}`}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                    >
                      Next
                    </Link>
                  )}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
