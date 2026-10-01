'use client';

import { useState, useEffect } from 'react';
import { assignPaymentFlow } from './actions';
import { Loader2, CheckCircle } from 'lucide-react';

interface PaymentFlow {
    id: string;
    name: string;
    description: string | null;
    requiresInstallationPayment: boolean;
    installationFeeAmount: number | null;
    freeInstallation: boolean;
    requiresFirstMonthPayment: boolean;
    supportsTrial: boolean;
    trialDays: number | null;
    isActive: boolean;
}

interface PaymentFlowSelectorProps {
    userId: string;
    currentFlowId?: string | null;
}

export function PaymentFlowSelector({ userId, currentFlowId }: PaymentFlowSelectorProps) {
    const [paymentFlows, setPaymentFlows] = useState<PaymentFlow[]>([]);
    const [selectedFlowId, setSelectedFlowId] = useState(currentFlowId || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetch('/api/payment-flows')
            .then(res => res.json())
            .then(data => {
                setPaymentFlows(data.filter((f: PaymentFlow) => f.isActive));
                setLoading(false);
            })
            .catch(err => {
                console.error('Error loading payment flows:', err);
                setLoading(false);
            });
    }, []);

    async function handleSave() {
        if (!selectedFlowId) {
            setMessage('Pilih Payment Flow terlebih dahulu');
            return;
        }

        setSaving(true);
        setMessage('');

        const result = await assignPaymentFlow(userId, selectedFlowId);

        if (result.success) {
            setMessage('Payment Flow berhasil dipilih!');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } else {
            setMessage(result.error || 'Gagal menyimpan');
        }

        setSaving(false);
    }

    const selectedFlow = paymentFlows.find(f => f.id === selectedFlowId);

    if (loading) {
        return (
            <div className="flex items-center text-gray-500">
                <Loader2 className="animate-spin h-5 w-5 mr-2" />
                Memuat payment flows...
            </div>
        );
    }

    if (currentFlowId && !saving) {
        return (
            <div className="flex items-center text-green-700 bg-green-50 px-4 py-2 rounded-md">
                <CheckCircle className="h-5 w-5 mr-2" />
                Payment Flow sudah dipilih
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Payment Flow *
                </label>
                <select
                    value={selectedFlowId}
                    onChange={(e) => setSelectedFlowId(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={saving}
                >
                    <option value="">-- Pilih Payment Flow --</option>
                    {paymentFlows.map((flow) => (
                        <option key={flow.id} value={flow.id}>
                            {flow.name}
                        </option>
                    ))}
                </select>
            </div>

            {selectedFlow && (
                <div className="bg-gray-50 p-4 rounded-md text-sm space-y-2">
                    <p className="font-medium text-gray-900">{selectedFlow.name}</p>
                    {selectedFlow.description && (
                        <p className="text-gray-600">{selectedFlow.description}</p>
                    )}
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                        {selectedFlow.requiresInstallationPayment && !selectedFlow.freeInstallation && (
                            <li>💰 Biaya Instalasi: Rp {Number(selectedFlow.installationFeeAmount || 0).toLocaleString('id-ID')}</li>
                        )}
                        {selectedFlow.freeInstallation && (
                            <li>✅ Gratis Instalasi</li>
                        )}
                        {selectedFlow.supportsTrial && (
                            <li>🎁 Trial: {selectedFlow.trialDays} hari</li>
                        )}
                        {selectedFlow.requiresFirstMonthPayment && (
                            <li>📅 Bayar bulan pertama setelah instalasi</li>
                        )}
                    </ul>
                </div>
            )}

            {message && (
                <div className={`p-3 rounded-md text-sm ${message.includes('berhasil') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                    }`}>
                    {message}
                </div>
            )}

            <button
                onClick={handleSave}
                disabled={!selectedFlowId || saving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
                {saving ? (
                    <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                        Menyimpan...
                    </>
                ) : (
                    'Simpan Payment Flow'
                )}
            </button>
        </div>
    );
}
