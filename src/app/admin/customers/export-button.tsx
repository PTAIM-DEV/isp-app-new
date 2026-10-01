'use client';

import { useState } from 'react';
import { Download, Check, X, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ExportButtonProps {
    filters: any;
}

const AVAILABLE_FIELDS = [
    { id: 'name', label: 'Nama' },
    { id: 'email', label: 'Email' },
    { id: 'phone', label: 'Telepon' },
    { id: 'nik', label: 'NIK' },
    { id: 'status', label: 'Status' },
    { id: 'address', label: 'Alamat' },
    { id: 'province', label: 'Provinsi' },
    { id: 'city', label: 'Kota' },
    { id: 'package', label: 'Paket Langganan' },
    { id: 'price', label: 'Harga' },
    { id: 'sales', label: 'Sales' },
    { id: 'xenditId', label: 'Xendit ID' },
    { id: 'createdAt', label: 'Tanggal Terdaftar' },
];

export function ExportButton({ filters }: ExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFields, setSelectedFields] = useState<string[]>(['name', 'email', 'phone', 'status', 'package']);

    const toggleField = (fieldId: string) => {
        setSelectedFields(prev =>
            prev.includes(fieldId)
                ? prev.filter(f => f !== fieldId)
                : [...prev, fieldId]
        );
    };

    const handleSelectAll = () => {
        if (selectedFields.length === AVAILABLE_FIELDS.length) {
            setSelectedFields([]);
        } else {
            setSelectedFields(AVAILABLE_FIELDS.map(f => f.id));
        }
    };

    const handleExport = async () => {
        if (selectedFields.length === 0) return;

        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/customers/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    filters,
                    fields: selectedFields,
                }),
            });

            if (!response.ok) throw new Error('Export failed');

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            setIsOpen(false);
        } catch (error) {
            console.error('Export error:', error);
            alert('Gagal mengunduh data export');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                <Download className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
                Export CSV
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={() => setIsOpen(false)}></div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                        Export Data Pelanggan
                                    </h3>
                                    <div className="mt-2">
                                        <p className="text-sm text-gray-500 mb-4">
                                            Pilih kolom data yang ingin disertakan dalam file CSV.
                                        </p>

                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium text-gray-700">Kolom Tersedia:</span>
                                            <button
                                                type="button"
                                                onClick={handleSelectAll}
                                                className="text-xs text-indigo-600 hover:text-indigo-800"
                                            >
                                                {selectedFields.length === AVAILABLE_FIELDS.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-md p-2">
                                            {AVAILABLE_FIELDS.map((field) => (
                                                <div key={field.id} className="flex items-center">
                                                    <input
                                                        id={`field-${field.id}`}
                                                        name={`field-${field.id}`}
                                                        type="checkbox"
                                                        checked={selectedFields.includes(field.id)}
                                                        onChange={() => toggleField(field.id)}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                                    />
                                                    <label htmlFor={`field-${field.id}`} className="ml-2 block text-sm text-gray-900">
                                                        {field.label}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    disabled={isLoading || selectedFields.length === 0}
                                    onClick={handleExport}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />
                                            Exporting...
                                        </>
                                    ) : (
                                        'Download CSV'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
