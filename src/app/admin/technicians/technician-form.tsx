'use client';

import { useState, useEffect } from 'react';
import { saveTechnician } from './actions';
import { Loader2, MapPin, User, Mail, Phone, Lock, Calendar, Image as ImageIcon, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { TechnicianPhotoUpload } from './technician-photo-upload';

interface TechnicianFormProps {
    initialData?: any;
    provinces?: any[];
}

const SKILL_OPTIONS = [
    { value: 'INSTALLATION', label: 'Instalasi' },
    { value: 'MAINTENANCE', label: 'Maintenance' },
    { value: 'TROUBLESHOOTING', label: 'Troubleshooting' },
    { value: 'UPGRADE', label: 'Upgrade' },
];

export function TechnicianForm({ initialData, provinces = [] }: TechnicianFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    // Form state
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>(initialData?.assignedProvinces || []);
    const [selectedCities, setSelectedCities] = useState<string[]>(initialData?.assignedCities || []);
    const [selectedSkills, setSelectedSkills] = useState<string[]>(initialData?.skills || []);
    const [cities, setCities] = useState<any[]>([]);
    const [loadingCities, setLoadingCities] = useState(false);
    const [showPasswordFields, setShowPasswordFields] = useState(!initialData);
    const [photoUrl, setPhotoUrl] = useState<string | null>(initialData?.photoUrl || null);

    // Load cities for selected provinces
    useEffect(() => {
        if (selectedProvinces.length > 0) {
            loadCitiesForProvinces();
        } else {
            setCities([]);
            setSelectedCities([]);
        }
    }, [selectedProvinces]);

    async function loadCitiesForProvinces() {
        try {
            setLoadingCities(true);
            const allCities: any[] = [];
            for (const provinceId of selectedProvinces) {
                const res = await fetch(`/api/locations/cities?provinceId=${provinceId}`);
                if (res.ok) {
                    const data = await res.json();
                    allCities.push(...data);
                }
            }
            setCities(allCities);
        } catch (error) {
            console.error('Error loading cities:', error);
        } finally {
            setLoadingCities(false);
        }
    }

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        setError('');

        // Add selected provinces and cities to formData
        selectedProvinces.forEach(provinceId => {
            formData.append('assignedProvinces', provinceId);
        });
        selectedCities.forEach(cityId => {
            formData.append('assignedCities', cityId);
        });
        selectedSkills.forEach(skill => {
            formData.append('skills', skill);
        });

        // Add photo URL (can be null if removed)
        formData.append('photoUrl', photoUrl || '');

        const result = await saveTechnician(formData, initialData?.id);

        setIsLoading(false);
        if (result.success) {
            router.push('/admin/technicians');
        } else {
            setError(result.error || 'Gagal menyimpan data');
        }
    }

    return (
        <form action={handleSubmit} className="space-y-6">
            {error && (
                <div className="p-4 rounded-md bg-red-50 text-red-700 border border-red-200">
                    {error}
                </div>
            )}

            {/* Basic Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Informasi Dasar
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nama Lengkap <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            required
                            defaultValue={initialData?.name}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nomor Telepon <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="tel"
                                name="phone"
                                required
                                defaultValue={initialData?.phone}
                                className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="email"
                                name="email"
                                defaultValue={initialData?.email || ''}
                                className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="status"
                            defaultValue={initialData?.status || 'ACTIVE'}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                        >
                            <option value="ACTIVE">Aktif</option>
                            <option value="INACTIVE">Non-Aktif</option>
                            <option value="ON_LEAVE">Cuti</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tanggal Bergabung
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="date"
                                name="joinDate"
                                defaultValue={initialData?.joinDate ? new Date(initialData.joinDate).toISOString().split('T')[0] : ''}
                                className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <TechnicianPhotoUpload
                            currentPhotoUrl={initialData?.photoUrl || null}
                            onPhotoChange={(url) => setPhotoUrl(url)}
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </div>

            {/* Password Section */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Lock className="w-5 h-5 mr-2" />
                    Password
                </h3>
                {initialData && (
                    <div className="mb-4">
                        <button
                            type="button"
                            onClick={() => setShowPasswordFields(!showPasswordFields)}
                            className="text-sm text-indigo-600 hover:text-indigo-800"
                        >
                            {showPasswordFields ? 'Sembunyikan' : 'Ubah Password'}
                        </button>
                    </div>
                )}
                {showPasswordFields && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Password {initialData ? '(kosongkan jika tidak diubah)' : ''} <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="password"
                                required={!initialData}
                                minLength={6}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                            />
                            <p className="mt-1 text-xs text-gray-500">Minimal 6 karakter</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Konfirmasi Password <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="password"
                                name="passwordConfirm"
                                required={!initialData}
                                minLength={6}
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-gray-900"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Work Area */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Area Kerja
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Provinsi (Bisa pilih lebih dari satu)
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                            {provinces.map((province) => (
                                <label key={province.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                    <input
                                        type="checkbox"
                                        checked={selectedProvinces.includes(province.id)}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedProvinces([...selectedProvinces, province.id]);
                                            } else {
                                                setSelectedProvinces(selectedProvinces.filter(p => p !== province.id));
                                                setSelectedCities(selectedCities.filter(c => {
                                                    const city = cities.find(ct => ct.id === c);
                                                    return city && city.provinceId !== province.id;
                                                }));
                                            }
                                        }}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-700">{province.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {selectedProvinces.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Kota/Kabupaten (Bisa pilih lebih dari satu)
                                {loadingCities && <span className="text-xs text-gray-500 ml-2">Memuat...</span>}
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                                {cities.map((city) => (
                                    <label key={city.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-1 rounded">
                                        <input
                                            type="checkbox"
                                            checked={selectedCities.includes(city.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedCities([...selectedCities, city.id]);
                                                } else {
                                                    setSelectedCities(selectedCities.filter(c => c !== city.id));
                                                }
                                            }}
                                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">{city.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Skills */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Keahlian (Bisa pilih lebih dari satu)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {SKILL_OPTIONS.map((skill) => (
                        <label key={skill.value} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 p-2 rounded border border-gray-300">
                            <input
                                type="checkbox"
                                checked={selectedSkills.includes(skill.value)}
                                onChange={(e) => {
                                    if (e.target.checked) {
                                        setSelectedSkills([...selectedSkills, skill.value]);
                                    } else {
                                        setSelectedSkills(selectedSkills.filter(s => s !== skill.value));
                                    }
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                            />
                            <span className="text-sm text-gray-700">{skill.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    Batal
                </button>
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
