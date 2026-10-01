'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { createPaymentFlow, updatePaymentFlow } from './actions';

interface PaymentFlowFormProps {
    initialData?: any;
}

export function PaymentFlowForm({ initialData }: PaymentFlowFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [requiresInstall, setRequiresInstall] = useState(initialData?.requiresInstallationPayment || false);
    const [supportsTrial, setSupportsTrial] = useState(initialData?.supportsTrial || false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        if (initialData) {
            await updatePaymentFlow(initialData.id, formData);
        } else {
            await createPaymentFlow(formData);
        }
        setIsLoading(false);
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            <div>
                <label className="block text-sm font-medium text-gray-700">Nama Flow</label>
                <input
                    type="text"
                    name="name"
                    required
                    defaultValue={initialData?.name}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Deskripsi</label>
                <textarea
                    name="description"
                    defaultValue={initialData?.description}
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-4">Konfigurasi Instalasi</h4>
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="requiresInstallationPayment"
                            id="requiresInstallationPayment"
                            checked={requiresInstall}
                            onChange={(e) => setRequiresInstall(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="requiresInstallationPayment" className="ml-2 block text-sm text-gray-900">
                            Wajib Bayar Instalasi
                        </label>
                    </div>

                    {requiresInstall && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Biaya Instalasi (Rp)</label>
                            <input
                                type="number"
                                name="installationFeeAmount"
                                defaultValue={initialData?.installationFeeAmount || 0}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>
                    )}

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="freeInstallation"
                            id="freeInstallation"
                            defaultChecked={initialData?.freeInstallation}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="freeInstallation" className="ml-2 block text-sm text-gray-900">
                            Gratis Instalasi (Promo)
                        </label>
                    </div>
                </div>
            </div>

            <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-4">Konfigurasi Pembayaran Bulanan</h4>
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="requiresFirstMonthPayment"
                            id="requiresFirstMonthPayment"
                            defaultChecked={initialData?.requiresFirstMonthPayment ?? true}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="requiresFirstMonthPayment" className="ml-2 block text-sm text-gray-900">
                            Wajib Bayar Bulan Pertama
                        </label>
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="firstMonthPaymentAfterInstall"
                            id="firstMonthPaymentAfterInstall"
                            defaultChecked={initialData?.firstMonthPaymentAfterInstall}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="firstMonthPaymentAfterInstall" className="ml-2 block text-sm text-gray-900">
                            Bayar Setelah Instalasi Selesai
                        </label>
                    </div>
                </div>
            </div>

            <div className="border-t pt-4">
                <h4 className="text-md font-medium text-gray-900 mb-4">Konfigurasi Trial</h4>
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="supportsTrial"
                            id="supportsTrial"
                            checked={supportsTrial}
                            onChange={(e) => setSupportsTrial(e.target.checked)}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="supportsTrial" className="ml-2 block text-sm text-gray-900">
                            Support Trial
                        </label>
                    </div>

                    {supportsTrial && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Durasi Trial (Hari)</label>
                            <input
                                type="number"
                                name="trialDays"
                                defaultValue={initialData?.trialDays || 3}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>
                    )}
                </div>
            </div>

            {initialData && (
                <div className="border-t pt-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            name="isActive"
                            id="isActive"
                            defaultChecked={initialData.isActive}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                            Aktif
                        </label>
                    </div>
                </div>
            )}

            <div className="flex justify-end pt-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                            Menyimpan...
                        </>
                    ) : (
                        'Simpan'
                    )}
                </button>
            </div>
        </form>
    );
}
