'use client';

import { useState, useEffect, useRef } from 'react';
import { Wifi, WifiOff, Smartphone, RefreshCw, Link, AlertTriangle, Eye, EyeOff, Loader2 } from 'lucide-react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'scanning' | 'connected' | 'error';

interface WhatsAppStatus {
    status: string;
    qrCode: string | null;
    timestamp?: number;
    error?: string;
}

export default function WhatsAppConnection() {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [sseConnected, setSseConnected] = useState(false);

    // Config (saved to localStorage)
    const [instanceName, setInstanceName] = useState('isp-app');
    const [showConfig, setShowConfig] = useState(false);

    const pollInterval = useRef<NodeJS.Timeout | null>(null);

    // Load config from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('whatsapp_instance_name');
            if (saved) setInstanceName(saved);
        }
    }, []);

    // SSE connection for status updates
    useEffect(() => {
        let eventSource: EventSource | null = null;
        let reconnectTimeout: NodeJS.Timeout | null = null;

        const connectSSE = () => {
            try {
                eventSource = new EventSource('/api/whatsapp/status');

                eventSource.onopen = () => {
                    setSseConnected(true);
                    setError(null);
                };

                eventSource.onmessage = (event) => {
                    try {
                        const data: WhatsAppStatus = JSON.parse(event.data);

                        // Map API status to component status
                        if (data.status === 'CONNECTED') {
                            setConnectionStatus('connected');
                            setQrCode(null);
                            setError(null);
                        } else if (data.status === 'SCAN_QR') {
                            setConnectionStatus('scanning');
                            setQrCode(data.qrCode);
                            setError(null);
                        } else if (data.status === 'CONNECTING') {
                            setConnectionStatus('connecting');
                            if (data.qrCode) setQrCode(data.qrCode);
                            setError(null);
                        } else if (data.status === 'API_UNREACHABLE') {
                            setConnectionStatus('disconnected');
                            setError(data.error || 'Evolution API is not reachable');
                        } else if (data.status === 'ERROR') {
                            setConnectionStatus('error');
                            setError(data.error || 'Unknown error');
                        } else {
                            // DISCONNECTED or NOT_INITIALIZED
                            setConnectionStatus('disconnected');
                            setQrCode(null);
                        }
                    } catch (err) {
                        console.error('Error parsing SSE data:', err);
                    }
                };

                eventSource.onerror = () => {
                    setSseConnected(false);
                    if (eventSource) eventSource.close();

                    reconnectTimeout = setTimeout(connectSSE, 5000);
                };
            } catch (err) {
                console.error('SSE connection error:', err);
                setSseConnected(false);
                reconnectTimeout = setTimeout(connectSSE, 5000);
            }
        };

        connectSSE();

        return () => {
            if (eventSource) eventSource.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    const handleConnect = async () => {
        setError(null);
        setIsConnecting(true);
        setConnectionStatus('connecting');

        try {
            const response = await fetch('/api/whatsapp/connect', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.success) {
                if (data.qrCode) {
                    setQrCode(data.qrCode);
                    setConnectionStatus('scanning');
                } else if (data.status === 'CONNECTED') {
                    setConnectionStatus('connected');
                } else {
                    setConnectionStatus('connecting');
                }
            } else {
                setError(data.error || 'Failed to connect');
                setConnectionStatus('error');
            }
        } catch (err: any) {
            setError(err.message || 'Connection failed');
            setConnectionStatus('error');
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect WhatsApp? Anda perlu scan QR code lagi untuk reconnect.')) {
            return;
        }

        setIsDisconnecting(true);

        try {
            const response = await fetch('/api/whatsapp/disconnect', {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                setConnectionStatus('disconnected');
                setQrCode(null);
            } else {
                setError(data.error || 'Failed to disconnect');
            }
        } catch (err: any) {
            setError(err.message || 'Disconnect failed');
        } finally {
            setIsDisconnecting(false);
        }
    };

    // Status badge color
    const getStatusBadge = () => {
        switch (connectionStatus) {
            case 'connected':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                        <Wifi className="w-3 h-3" /> ONLINE
                    </span>
                );
            case 'scanning':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" /> SCANNING
                    </span>
                );
            case 'connecting':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" /> CONNECTING
                    </span>
                );
            case 'error':
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        <AlertTriangle className="w-3 h-3" /> ERROR
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                        <WifiOff className="w-3 h-3" /> OFFLINE
                    </span>
                );
        }
    };

    return (
        <div className="space-y-6">
            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-medium text-red-800">Error</h4>
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Configuration Card */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Evolution API Configuration</h3>
                        <p className="text-sm text-gray-500">Configure the connection to your WhatsApp instance.</p>
                    </div>
                    <button
                        onClick={() => setShowConfig(!showConfig)}
                        className="text-gray-400 hover:text-gray-600 p-2"
                    >
                        {showConfig ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>

                {showConfig && (
                    <div className="space-y-4 pt-4 border-t">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Instance Name</label>
                            <input
                                type="text"
                                value={instanceName}
                                onChange={(e) => {
                                    setInstanceName(e.target.value);
                                    localStorage.setItem('whatsapp_instance_name', e.target.value);
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                disabled={connectionStatus === 'connected' || connectionStatus === 'scanning'}
                            />
                            <p className="text-xs text-gray-500 mt-1">Instance name configured in Evolution API</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Connection Status Card */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Connection Status</h3>
                        <p className="text-sm text-gray-500">Manage your WhatsApp session.</p>
                    </div>
                    {getStatusBadge()}
                </div>

                {/* Disconnected State */}
                {connectionStatus === 'disconnected' && (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 text-center">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-4">
                            <Smartphone className="w-8 h-8 text-gray-500" />
                        </div>
                        <h4 className="font-semibold text-lg text-gray-900">No Active Session</h4>
                        <p className="text-sm text-gray-500 mb-6 max-w-sm">
                            Click the button below to start pairing your WhatsApp.
                        </p>
                        <button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isConnecting ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    <Link className="w-5 h-5" />
                                    Create Instance & Connect
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Connecting State */}
                {connectionStatus === 'connecting' && !qrCode && (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border rounded-lg bg-blue-50 text-center">
                        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                        <h4 className="font-semibold text-lg text-gray-900">Connecting...</h4>
                        <p className="text-sm text-gray-500">Please wait while we prepare your QR code.</p>
                    </div>
                )}

                {/* Scanning State - QR Code Display */}
                {(connectionStatus === 'scanning' || (connectionStatus === 'connecting' && qrCode)) && (
                    <div className="flex flex-col items-center justify-center py-6 px-4 bg-white border rounded-lg">
                        <div className="mb-4 relative w-64 h-64 border-4 border-gray-900 rounded-xl overflow-hidden flex items-center justify-center bg-white shadow-lg">
                            {qrCode ? (
                                <img
                                    src={qrCode}
                                    alt="WhatsApp QR Code"
                                    className="w-full h-full object-contain"
                                />
                            ) : (
                                <RefreshCw className="w-10 h-10 text-gray-400 animate-spin" />
                            )}
                        </div>
                        <h4 className="font-bold text-lg text-gray-900 animate-pulse">Scan QR Code</h4>
                        <p className="text-sm text-gray-500 mt-2 text-center">
                            Open WhatsApp → Linked Devices → Link a Device
                        </p>
                        <button
                            onClick={() => {
                                setConnectionStatus('disconnected');
                                setQrCode(null);
                            }}
                            className="mt-4 text-sm text-red-500 hover:text-red-700"
                        >
                            Cancel
                        </button>
                    </div>
                )}

                {/* Connected State */}
                {connectionStatus === 'connected' && (
                    <div className="space-y-4">
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Link className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div>
                                <h4 className="font-semibold text-emerald-900">Successfully Connected</h4>
                                <p className="text-sm text-emerald-700">
                                    Instance <strong>{instanceName}</strong> is ready to receive messages.
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 justify-center pt-4">
                            <a
                                href="/admin/whatsapp/chats"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                            >
                                Open Chatbox
                            </a>
                            <button
                                onClick={handleDisconnect}
                                disabled={isDisconnecting}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 font-medium rounded-lg border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            >
                                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {connectionStatus === 'error' && (
                    <div className="flex flex-col items-center justify-center py-8 px-4 border-2 border-dashed border-red-200 rounded-lg bg-red-50 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                        <h4 className="font-semibold text-lg text-gray-900">Connection Error</h4>
                        <p className="text-sm text-gray-500 mb-4">Something went wrong. Please try again.</p>
                        <button
                            onClick={handleConnect}
                            disabled={isConnecting}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {isConnecting ? 'Connecting...' : 'Retry Connection'}
                        </button>
                    </div>
                )}

                {/* SSE Status */}
                <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs text-gray-400">
                    <span>
                        Real-time updates: {sseConnected ? '🟢 Active' : '🔴 Inactive'}
                    </span>
                    <span>
                        Instance: {instanceName}
                    </span>
                </div>
            </div>
        </div>
    );
}
