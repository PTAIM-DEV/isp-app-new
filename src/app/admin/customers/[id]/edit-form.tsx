'use client';

import { useState, useEffect } from 'react';
import { Loader2, Edit2, X } from 'lucide-react';
import { updateCustomer } from '../actions';
import { EditLocationMap } from './edit-location-map';

interface EditFormProps {
    customer: any;
    packages: any[];
    paymentFlows: any[];
    provinces: any[];
    sales?: any[];
    onSuccess?: () => void;
}

export function EditForm({ customer, packages, paymentFlows, provinces, sales = [], onSuccess }: EditFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedProvince, setSelectedProvince] = useState(customer.provinceId || '');
    const [cities, setCities] = useState<any[]>([]);
    const [selectedCity, setSelectedCity] = useState(customer.cityId || '');
    const [districts, setDistricts] = useState<any[]>([]);
    const [selectedDistrict, setSelectedDistrict] = useState(customer.districtId || '');
    const [villages, setVillages] = useState<any[]>([]);

    // Load cities when province is selected
    useEffect(() => {
        if (selectedProvince) {
            fetch(`/api/locations/cities?provinceId=${selectedProvince}`)
                .then(res => res.json())
                .then(data => setCities(data));
        }
    }, [selectedProvince]);

    // Load districts when city is selected
    useEffect(() => {
        if (selectedCity) {
            fetch(`/api/locations/districts?cityId=${selectedCity}`)
                .then(res => res.json())
                .then(data => setDistricts(data));
        }
    }, [selectedCity]);

    // Load villages when district is selected
    useEffect(() => {
        if (selectedDistrict) {
            fetch(`/api/locations/villages?districtId=${selectedDistrict}`)
                .then(res => res.json())
                .then(data => setVillages(data));
        }
    }, [selectedDistrict]);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError(null);
        
        const result = await updateCustomer(customer.id, formData);
        setIsLoading(false);
        
        if (result.success) {
            setIsOpen(false);
            if (onSuccess) onSuccess();
            // Reload page to show updated data
            window.location.reload();
        } else {
            setError(result.error || 'Gagal mengupdate pelanggan');
        }
    }

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
                <Edit2 className="-ml-1 mr-2 h-5 w-5" />
                Edit Informasi
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Edit Informasi Pelanggan</h3>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-gray-400 hover:text-gray-500"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        <p>{error}</p>
                    </div>
                )}

                <form action={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 gap-y-4 gap-x-4 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Nama Lengkap</label>
                            <input
                                type="text"
                                name="name"
                                defaultValue={customer.name}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Nomor Telepon</label>
                            <input
                                type="tel"
                                name="phone"
                                defaultValue={customer.phone}
                                required
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                name="email"
                                defaultValue={customer.email || ''}
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
                                defaultValue={customer.nik || ''}
                                placeholder="16 digit NIK"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                            <p className="mt-1 text-xs text-gray-500">Masukkan 16 digit NIK sesuai KTP</p>
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Alamat</label>
                            <textarea
                                name="address"
                                rows={3}
                                defaultValue={customer.address || ''}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                name="status"
                                defaultValue={customer.status}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            >
                                <option value="LEAD">LEAD - Calon Pelanggan</option>
                                <option value="LEAD_PAYMENT_PENDING">LEAD_PAYMENT_PENDING - Menunggu Pembayaran Instalasi</option>
                                <option value="PENDING_INSTALL">PENDING_INSTALL - Menunggu Instalasi</option>
                                <option value="INSTALLED">INSTALLED - Sudah Terpasang</option>
                                <option value="INSTALLED_PAYMENT_PENDING">INSTALLED_PAYMENT_PENDING - Menunggu Pembayaran Bulan Pertama</option>
                                <option value="ACTIVE">ACTIVE - Aktif</option>
                                <option value="BLOCKED">BLOCKED - Diblokir (Overdue)</option>
                                <option value="INACTIVE">INACTIVE - Nonaktif (Terminated/Churn)</option>
                            </select>
                        </div>

                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Paket Layanan</label>
                            <select
                                name="packageId"
                                defaultValue={customer.selectedPackageId || ''}
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
                                defaultValue={customer.assignedPaymentFlowId || ''}
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
                                defaultValue={customer.salesId || ''}
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
                            <label className="block text-sm font-medium text-gray-700">Kode Promo</label>
                            <input
                                type="text"
                                name="promoCode"
                                defaultValue={customer.registeredPromoCode || ''}
                                placeholder="Masukkan kode promo"
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 uppercase"
                                onChange={(e) => {
                                    e.target.value = e.target.value.toUpperCase();
                                }}
                            />
                        </div>

                        <div className="sm:col-span-1">
                            <label className="block text-sm font-medium text-gray-700">Provinsi</label>
                            <select
                                name="provinceId"
                                value={selectedProvince}
                                onChange={(e) => {
                                    setSelectedProvince(e.target.value);
                                    setSelectedCity('');
                                    setSelectedDistrict('');
                                }}
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
                                onChange={(e) => {
                                    setSelectedCity(e.target.value);
                                    setSelectedDistrict('');
                                }}
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
                                onChange={(e) => {
                                    setSelectedDistrict(e.target.value);
                                }}
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
                                defaultValue={customer.villageId || ''}
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
                            <label className="block text-sm font-medium text-gray-700">Kode Pos</label>
                            <input
                                type="text"
                                name="postalCode"
                                defaultValue={customer.postalCode || ''}
                                maxLength={5}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>

                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Lokasi Pemasangan (Koordinat)</label>
                            <p className="text-xs text-gray-500 mb-2">Peta akan otomatis mencari lokasi berdasarkan alamat, kecamatan, atau kabupaten</p>
                            <div className="border rounded-md overflow-hidden p-3">
                                <EditLocationMap
                                    onLocationSelect={(lat, lng) => {
                                        const latInput = document.querySelector('input[name="latitude"]') as HTMLInputElement;
                                        const lngInput = document.querySelector('input[name="longitude"]') as HTMLInputElement;
                                        if (latInput && lngInput) {
                                            latInput.value = lat.toString();
                                            lngInput.value = lng.toString();
                                        }
                                    }}
                                    initialLat={customer.latitude || undefined}
                                    initialLng={customer.longitude || undefined}
                                    address={customer.address || ''}
                                    districtName={districts.find(d => d.id === selectedDistrict)?.name || customer.district?.name}
                                    cityName={cities.find(c => c.id === selectedCity)?.name || customer.city?.name}
                                    provinceName={provinces.find(p => p.id === selectedProvince)?.name || customer.province?.name}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        name="latitude"
                                        step="any"
                                        defaultValue={customer.latitude || ''}
                                        placeholder="Contoh: 1.4748"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        name="longitude"
                                        step="any"
                                        defaultValue={customer.longitude || ''}
                                        placeholder="Contoh: 124.8426"
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm border p-2"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="sm:col-span-2 border-t pt-4 mt-4">
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Reset Password</h4>
                            <p className="text-xs text-gray-500 mb-2">Kosongkan jika tidak ingin mengubah password</p>
                            <input
                                type="password"
                                name="password"
                                placeholder="Masukkan password baru (kosongkan jika tidak diubah)"
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 space-x-3">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            disabled={isLoading}
                            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                    Menyimpan...
                                </>
                            ) : (
                                'Simpan Perubahan'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

