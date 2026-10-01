'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import {
    createCustomer,
    createInstallationInvoiceAction,
    getWelcomeMessagePreviewAction,
    sendCustomWelcomeMessageAction
} from './actions';
import { LocationMap } from '../../register/location-map';
import { useRouter } from 'next/navigation';

interface CustomerFormProps {
    packages: any[];
    paymentFlows: any[];
    provinces: any[];
    sales?: any[];
}

export function CustomerForm({ packages, paymentFlows, provinces, sales = [] }: CustomerFormProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [selectedProvince, setSelectedProvince] = useState('');
    const [cities, setCities] = useState<any[]>([]);
    const [selectedCity, setSelectedCity] = useState('');
    const [districts, setDistricts] = useState<any[]>([]);
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [villages, setVillages] = useState<any[]>([]);
    const [isMigration, setIsMigration] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [latitude, setLatitude] = useState<number | null>(null);
    const [longitude, setLongitude] = useState<number | null>(null);

    // Modal State
    const [showSuccessDialog, setShowSuccessDialog] = useState(false);
    const [createdUserId, setCreatedUserId] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    // Interactive Flow State
    const [createInvoice, setCreateInvoice] = useState(false);
    const [finalInstallationFee, setFinalInstallationFee] = useState(0);

    const [sendWelcome, setSendWelcome] = useState(true);
    const [welcomeMessageContent, setWelcomeMessageContent] = useState('');
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    // Helper to generate preview
    const generatePreview = async (userId?: string) => {
        const uid = userId || createdUserId;
        if (!uid) return;

        setIsLoadingPreview(true);
        const res = await getWelcomeMessagePreviewAction(uid);
        if (res.success && res.preview) {
            setWelcomeMessageContent(res.preview);
        }
        setIsLoadingPreview(false);
    };

    // Watch for installation fee input to set default checkbox state
    // We can't watch formData directly here, but we can set it once the modal opens based on input
    // Or we use a controlled input for installation fee in the main form.
    // For simplicity, we'll read it from the saved fee in modal step (we need to capture it).
    // Let's modify the handleSubmit to capture the fee.

    // Fetch cities when province changes
    async function handleProvinceChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const provinceId = e.target.value;
        setSelectedProvince(provinceId);
        setSelectedCity('');
        setCities([]);
        setDistricts([]);
        setVillages([]);

        if (provinceId) {
            const res = await fetch(`/api/locations/cities?provinceId=${provinceId}`);
            const data = await res.json();
            setCities(data);
        }
    }

    // Fetch districts when city changes
    async function handleCityChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const cityId = e.target.value;
        setSelectedCity(cityId);
        setSelectedDistrict('');
        setDistricts([]);
        setVillages([]);

        if (cityId) {
            const res = await fetch(`/api/locations/districts?cityId=${cityId}`);
            const data = await res.json();
            setDistricts(data);
        }
    }

    // Fetch villages when district changes
    async function handleDistrictChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const districtId = e.target.value;
        setSelectedDistrict(districtId);
        setVillages([]);

        if (districtId) {
            const res = await fetch(`/api/locations/villages?districtId=${districtId}`);
            const data = await res.json();
            setVillages(data);
        }
    }

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);

        // Capture installation fee for modal defaults
        const fee = Number(formData.get('installationFee') || 0);

        const result = await createCustomer(formData);

        if (result.success && result.userId) {
            setCreatedUserId(result.userId);

            // Set defaults for modal
            if (fee > 0) {
                setCreateInvoice(true);
                setFinalInstallationFee(fee);
            }

            // Generate initial welcome message preview
            await generatePreview(result.userId);

            setShowSuccessDialog(true);
            setIsLoading(false); // Stop loading form, show modal
        } else {
            setError(result.error || 'Gagal membuat pelanggan');
            setIsLoading(false);
        }
    }

    async function handleFinalize() {
        if (!createdUserId) return;
        setIsProcessing(true);

        // 1. Process Invoice
        if (createInvoice && finalInstallationFee > 0) {
            await createInstallationInvoiceAction(createdUserId, finalInstallationFee);
        }

        // 2. Process Welcome Message
        if (sendWelcome && welcomeMessageContent) {
            await sendCustomWelcomeMessageAction(createdUserId, welcomeMessageContent);
        }

        // Redirect
        setIsProcessing(false);
        window.location.href = '/admin/customers';
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    <p className="font-medium">Error:</p>
                    <p>{error}</p>
                </div>
            )}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Informasi Pribadi</h3>
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                    <input
                        type="text"
                        name="name"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Nomor Telepon (WhatsApp)</label>
                    <input
                        type="tel"
                        name="phone"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Email (Opsional)</label>
                    <input
                        type="email"
                        name="email"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">NIK (Nomor Induk Kependudukan)</label>
                    <input
                        type="text"
                        name="nik"
                        maxLength={16}
                        pattern="[0-9]{16}"
                        placeholder="16 digit NIK"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                    <p className="mt-1 text-xs text-gray-500">Masukkan 16 digit NIK sesuai KTP</p>
                </div>

                <div className="sm:col-span-2 border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Layanan & Pembayaran</h3>
                </div>

                <div className="sm:col-span-2">
                    <label className="flex items-center">
                        <input
                            type="checkbox"
                            name="isMigration"
                            checked={isMigration}
                            onChange={(e) => setIsMigration(e.target.checked)}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm font-medium text-gray-700">
                            Customer Migrasi (Langsung Aktif, Skip Flow Instalasi)
                        </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500">
                        Centang jika customer ini migrasi dari sistem lama. Customer akan langsung aktif tanpa perlu instalasi dan pembayaran pertama.
                    </p>
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Paket Layanan</label>
                    <select
                        name="packageId"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Pilih Paket</option>
                        {packages.map((pkg) => (
                            <option key={pkg.id} value={pkg.id}>
                                {pkg.name} - {pkg.speed} (Rp {pkg.price.toLocaleString('id-ID')})
                            </option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Payment Flow</label>
                    <select
                        name="paymentFlowId"
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Pilih Flow</option>
                        {paymentFlows.map((flow) => (
                            <option key={flow.id} value={flow.id}>
                                {flow.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Sales <span className="text-gray-500 text-xs">(Opsional)</span></label>
                    <select
                        name="salesId"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Pilih Sales</option>
                        {sales && sales.length > 0 ? (
                            sales.map((sale) => (
                                <option key={sale.id} value={sale.id}>
                                    {sale.name}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>Tidak ada sales tersedia</option>
                        )}
                    </select>
                    {sales && sales.length === 0 && (
                        <p className="mt-1 text-xs text-gray-500">
                            Belum ada data sales. Silakan tambah sales terlebih dahulu.
                        </p>
                    )}
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Biaya Instalasi (Rp)</label>
                    <input
                        type="number"
                        name="installationFee"
                        defaultValue={0}
                        min={0}
                        step={1000}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        placeholder="0"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Biaya pemasangan awal (akan dibuatkan invoice otomatis)
                    </p>
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Kode Promo (Opsional)</label>
                    <input
                        type="text"
                        name="promoCode"
                        placeholder="Masukkan kode promo"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 uppercase"
                        onChange={(e) => {
                            e.target.value = e.target.value.toUpperCase();
                        }}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                        Kode promo akan diterapkan saat aktivasi atau untuk customer migrasi
                    </p>
                </div>

                {isMigration && (
                    <>
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Tanggal Mulai Cycle <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                name="startCycleDate"
                                required={isMigration}
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Tanggal mulai billing cycle untuk customer migrasi
                            </p>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Billing Cycle (Hari) <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="billingCycle"
                                required={isMigration}
                                defaultValue="30"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            >
                                <option value="30">30 Hari (Bulanan)</option>
                                <option value="60">60 Hari (2 Bulan)</option>
                                <option value="90">90 Hari (3 Bulan)</option>
                                <option value="180">180 Hari (6 Bulan)</option>
                                <option value="365">365 Hari (Tahunan)</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500">
                                Interval pembayaran untuk customer migrasi
                            </p>
                        </div>
                    </>
                )}

                <div className="sm:col-span-2 border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Alamat Pemasangan</h3>
                </div>

                <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Alamat Lengkap</label>
                    <textarea
                        name="address"
                        rows={3}
                        required
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Provinsi</label>
                    <select
                        name="provinceId"
                        value={selectedProvince}
                        onChange={handleProvinceChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Pilih Provinsi</option>
                        {provinces.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Kota/Kabupaten</label>
                    <select
                        name="cityId"
                        value={selectedCity}
                        onChange={handleCityChange}
                        disabled={!selectedProvince}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Pilih Kota</option>
                        {cities.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Kecamatan</label>
                    <select
                        name="districtId"
                        value={selectedDistrict}
                        onChange={handleDistrictChange}
                        disabled={!selectedCity}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Pilih Kecamatan</option>
                        {districts.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Kelurahan/Desa</label>
                    <select
                        name="villageId"
                        disabled={!selectedDistrict}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    >
                        <option value="">Pilih Kelurahan</option>
                        {villages.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>

                <div className="sm:col-span-1">
                    <label className="block text-sm font-medium text-gray-700">Kode Pos (Opsional)</label>
                    <input
                        type="text"
                        name="postalCode"
                        placeholder="Contoh: 95370"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                    />
                </div>

                <div className="sm:col-span-2 border-t pt-4 mt-4">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Koordinat Lokasi</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Pilih lokasi di peta untuk mendapatkan koordinat GPS. Koordinat akan otomatis tersimpan saat Anda mengklik lokasi di peta.
                    </p>
                    <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                        <LocationMap
                            onLocationSelect={(lat, lng) => {
                                setLatitude(lat);
                                setLongitude(lng);
                            }}
                        />
                    </div>
                    {latitude && longitude && (
                        <div className="mt-2 text-sm text-gray-600">
                            <p>Koordinat terpilih: <strong>{latitude.toFixed(6)}, {longitude.toFixed(6)}</strong></p>
                        </div>
                    )}
                    {/* Hidden inputs untuk koordinat */}
                    <input type="hidden" name="latitude" value={latitude || ''} />
                    <input type="hidden" name="longitude" value={longitude || ''} />
                </div>
            </div>

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
                        'Simpan Pelanggan'
                    )}
                </button>
            </div>

            {/* Success Modal */}
            {showSuccessDialog && createdUserId && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Pelanggan Berhasil Dibuat
                                        </h3>
                                        <div className="mt-2 text-sm text-gray-500">
                                            Silakan konfirmasi tindakan lanjutan berikut:
                                        </div>

                                        <div className="mt-4 space-y-4">
                                            {/* Installation Invoice Section */}
                                            <div className="border rounded-md p-3">
                                                <label className="flex items-center mb-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={createInvoice}
                                                        onChange={(e) => setCreateInvoice(e.target.checked)}
                                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                    />
                                                    <span className="ml-2 font-medium text-gray-900">Buat Invoice Instalasi</span>
                                                </label>

                                                {createInvoice && (
                                                    <div className="ml-6">
                                                        <label className="block text-xs text-gray-500 mb-1">Nominal (Rp)</label>
                                                        <input
                                                            type="number"
                                                            value={finalInstallationFee}
                                                            onChange={(e) => setFinalInstallationFee(Number(e.target.value))}
                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-1"
                                                        />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Welcome Message Section */}
                                            <div className="border rounded-md p-3">
                                                <div className="flex justify-between items-center mb-2">
                                                    <label className="flex items-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={sendWelcome}
                                                            onChange={(e) => setSendWelcome(e.target.checked)}
                                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                                        />
                                                        <span className="ml-2 font-medium text-gray-900">Kirim Welcome Message</span>
                                                    </label>
                                                    {sendWelcome && (
                                                        <button
                                                            type="button"
                                                            onClick={() => generatePreview()}
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                                                            disabled={isLoadingPreview}
                                                        >
                                                            {isLoadingPreview ? (
                                                                <Loader2 className="animate-spin h-3 w-3 mr-1" />
                                                            ) : (
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                                                </svg>
                                                            )}
                                                            Refresh Template
                                                        </button>
                                                    )}
                                                </div>

                                                {sendWelcome && (
                                                    <div className="ml-6">
                                                        <textarea
                                                            value={welcomeMessageContent}
                                                            onChange={(e) => setWelcomeMessageContent(e.target.value)}
                                                            rows={6}
                                                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-xs border p-2 font-mono"
                                                        />
                                                        <p className="mt-1 text-xs text-gray-500">
                                                            Pesan ini menggunakan template anti-ban. Anda bisa mengeditnya sebelum dikirim.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleFinalize}
                                    disabled={isProcessing}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    {isProcessing ? 'Memproses...' : 'Proses & Selesai'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        window.location.href = '/admin/customers';
                                    }}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                >
                                    Lewati
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </form>
    );
}

