'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Server, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import Link from 'next/link';
import ConnectionLogModal from './connection-log-modal';

interface Subscription {
  id: string;
  tier: {
    name: string;
  };
  user: {
    id: string;
    name: string;
  };
}

interface ServerFormProps {
  subscriptions: Subscription[];
  serverData?: {
    id: string;
    name: string;
    description: string | null;
    host: string;
    port: number;
    username: string;
    password: string;
    useSSL: boolean;
    timeout: number;
    hotspotProfile: string | null;
    hotspotInterface: string | null;
    subscriptionId: string | null;
  };
}

export default function ServerForm({ subscriptions, serverData }: ServerFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [connectionLogs, setConnectionLogs] = useState<string[]>([]);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [connectionError, setConnectionError] = useState<string | undefined>();
  const [serverIdentity, setServerIdentity] = useState<string | undefined>();

  const [formData, setFormData] = useState({
    name: serverData?.name || '',
    description: serverData?.description || '',
    host: serverData?.host || '',
    port: String(serverData?.port || '8728'),
    username: serverData?.username || '',
    password: '', // Don't prefill password for security
    useSSL: serverData?.useSSL || false,
    timeout: String(serverData?.timeout || '5000'),
    hotspotProfile: serverData?.hotspotProfile || '',
    hotspotInterface: serverData?.hotspotInterface || '',
    subscriptionId: serverData?.subscriptionId || ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setError(null);
    setTestResult(null);
    setConnectionLogs([]);
    setConnectionError(undefined);

    try {
      const response = await fetch('/api/admin/hotspot/servers/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: formData.host,
          port: parseInt(formData.port),
          username: formData.username,
          password: formData.password,
          useSSL: formData.useSSL,
          timeout: parseInt(formData.timeout)
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (!contentType || !contentType.includes('application/json')) {
        // Response is not JSON, likely an error page
        const text = await response.text();
        const errorMsg = response.status === 401 
          ? 'Unauthorized - Please login as admin'
          : response.status === 404
          ? 'API endpoint not found'
          : `Server error (${response.status})`;
        
        setConnectionLogs([
          `[${new Date().toISOString()}] ✗ Error: ${errorMsg}`,
          `[${new Date().toISOString()}] Response status: ${response.status}`,
          `[${new Date().toISOString()}] Response type: ${contentType || 'unknown'}`,
          `[${new Date().toISOString()}] Response preview: ${text.substring(0, 200)}`,
          `[${new Date().toISOString()}] Network request failed`
        ]);
        setConnectionSuccess(false);
        setConnectionError(errorMsg);
        setShowLogModal(true);
        setTestResult({ success: false, message: errorMsg });
        setIsLoading(false);
        return;
      }

      try {
        data = await response.json();
      } catch (parseError: any) {
        throw new Error(`Failed to parse JSON response: ${parseError.message}`);
      }

      // Set logs and show modal
      if (data.logs && Array.isArray(data.logs)) {
        setConnectionLogs(data.logs);
        setConnectionSuccess(data.success || false);
        setConnectionError(data.error);
        setServerIdentity(data.serverIdentity);
        setShowLogModal(true);
      } else {
        // Fallback if logs not provided
        setConnectionLogs([
          `[${new Date().toISOString()}] Response received`,
          `[${new Date().toISOString()}] Success: ${data.success || false}`,
          `[${new Date().toISOString()}] Message: ${data.message || data.error || 'Unknown'}`
        ]);
        setConnectionSuccess(data.success || false);
        setConnectionError(data.error);
        setShowLogModal(true);
      }

      if (response.ok && data.success) {
        setTestResult({ success: true, message: 'Connection successful!' });
      } else {
        setTestResult({ success: false, message: data.error || data.message || 'Connection failed' });
      }
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to test connection';
      setConnectionLogs([
        `[${new Date().toISOString()}] ✗ Error: ${errorMessage}`,
        `[${new Date().toISOString()}] Error type: ${err.constructor?.name || 'Unknown'}`,
        `[${new Date().toISOString()}] Network request failed`
      ]);
      setConnectionSuccess(false);
      setConnectionError(errorMessage);
      setShowLogModal(true);
      setTestResult({ success: false, message: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const url = serverData 
        ? `/api/admin/hotspot/servers/${serverData.id}`
        : '/api/admin/hotspot/servers';
      
      const method = serverData ? 'PUT' : 'POST';

      const body: any = {
        ...formData,
        port: parseInt(formData.port),
        timeout: parseInt(formData.timeout),
        subscriptionId: formData.subscriptionId || null
      };

      // Only include password if it's provided (for edit)
      if (!serverData || formData.password) {
        body.password = formData.password;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (response.ok) {
        router.push('/admin/hotspot/servers');
        router.refresh();
      } else {
        setError(data.error || `Failed to ${serverData ? 'update' : 'create'} server`);
      }
    } catch (err: any) {
      setError(err.message || `Failed to ${serverData ? 'update' : 'create'} server`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <ConnectionLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        logs={connectionLogs}
        success={connectionSuccess}
        error={connectionError}
        serverIdentity={serverIdentity}
      />
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {testResult && (
          <div className={`border px-4 py-3 rounded ${
            testResult.success 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            <div className="flex items-center">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 mr-2 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              )}
              <div>
                <p className="font-medium">{testResult.message}</p>
                {testResult.success && (
                  <p className="text-sm mt-1 text-green-600">
                    ✓ Server is ready to use - No issues detected. You can proceed to save this configuration.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div>
          <h3 className="text-lg font-medium mb-4">Informasi Server</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Server *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subscription (Optional)
              </label>
              <select
                name="subscriptionId"
                value={formData.subscriptionId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Pilih Subscription</option>
                {subscriptions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.user.name} - {sub.tier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deskripsi
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Connection Info */}
        <div>
          <h3 className="text-lg font-medium mb-4">Koneksi MikroTik</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Host / IP Address *
              </label>
              <input
                type="text"
                name="host"
                value={formData.host}
                onChange={handleChange}
                required
                placeholder="192.168.1.1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Port *
              </label>
              <input
                type="number"
                name="port"
                value={formData.port}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {serverData ? '(kosongkan jika tidak diubah)' : '*'}
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required={!serverData}
                placeholder={serverData ? "Kosongkan jika tidak diubah" : ""}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timeout (ms)
              </label>
              <input
                type="number"
                name="timeout"
                value={formData.timeout}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="useSSL"
                checked={formData.useSSL}
                onChange={handleChange}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-700">
                Gunakan SSL/TLS
              </label>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isLoading || !formData.host || !formData.username || !formData.password}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Server className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </button>
            {isLoading && (
              <p className="mt-2 text-sm text-gray-500">
                Testing connection... Log akan muncul setelah selesai.
              </p>
            )}
          </div>
        </div>

        {/* Hotspot Configuration */}
        <div>
          <h3 className="text-lg font-medium mb-4">Konfigurasi Hotspot</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hotspot Profile
              </label>
              <input
                type="text"
                name="hotspotProfile"
                value={formData.hotspotProfile}
                onChange={handleChange}
                placeholder="default"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hotspot Interface
              </label>
              <input
                type="text"
                name="hotspotInterface"
                value={formData.hotspotInterface}
                onChange={handleChange}
                placeholder="wlan1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link
            href="/admin/hotspot/servers"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                Menyimpan...
              </>
            ) : (
              serverData ? 'Update Server' : 'Simpan Server'
            )}
          </button>
        </div>
      </form>
    </div>
    </>
  );
}

