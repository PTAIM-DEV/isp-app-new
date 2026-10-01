'use client';

import { useState, useEffect } from 'react';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';

interface Province {
    id: string;
    name: string;
}

interface City {
    id: string;
    name: string;
    provinceId: string;
}

interface District {
    id: string;
    name: string;
    cityId: string;
}

interface Village {
    id: string;
    name: string;
    districtId: string;
}

interface LocationSelectorProps {
    onLocationChange: (data: {
        provinceId: string;
        cityId: string;
        districtId: string;
        villageId: string;
        postalCode: string;
    }) => void;
}

export function LocationSelector({ onLocationChange }: LocationSelectorProps) {
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [districts, setDistricts] = useState<District[]>([]);
    const [villages, setVillages] = useState<Village[]>([]);

    const [selectedProvinceId, setSelectedProvinceId] = useState('');
    const [selectedCityId, setSelectedCityId] = useState('');
    const [selectedDistrictId, setSelectedDistrictId] = useState('');
    const [selectedVillageId, setSelectedVillageId] = useState('');
    const [postalCode, setPostalCode] = useState('');
    const [postalCodeSource, setPostalCodeSource] = useState<'api' | 'manual' | null>(null);

    const [isLoadingProvinces, setIsLoadingProvinces] = useState(true);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
    const [isLoadingVillages, setIsLoadingVillages] = useState(false);
    const [isFetchingPostalCode, setIsFetchingPostalCode] = useState(false);

    // Load provinces on mount
    useEffect(() => {
        fetchProvinces();
    }, []);

    // Load cities when province changes
    useEffect(() => {
        if (selectedProvinceId) {
            fetchCities(selectedProvinceId);
        } else {
            setCities([]);
            setSelectedCityId('');
        }
    }, [selectedProvinceId]);

    // Load districts when city changes
    useEffect(() => {
        if (selectedCityId) {
            fetchDistricts(selectedCityId);
        } else {
            setDistricts([]);
            setSelectedDistrictId('');
        }
    }, [selectedCityId]);

    // Load villages when district changes
    useEffect(() => {
        if (selectedDistrictId) {
            fetchVillages(selectedDistrictId);
            // Also fetch postal code based on district for now, or maybe village later
            const district = districts.find(d => d.id === selectedDistrictId);
            if (district) {
                fetchPostalCode(district.name);
            }
        } else {
            setVillages([]);
            setSelectedVillageId('');
            setPostalCode('');
            setPostalCodeSource(null);
        }
    }, [selectedDistrictId, districts]);

    // Notify parent of changes
    useEffect(() => {
        if (selectedProvinceId && selectedCityId && selectedDistrictId && selectedVillageId && postalCode) {
            onLocationChange({
                provinceId: selectedProvinceId,
                cityId: selectedCityId,
                districtId: selectedDistrictId,
                villageId: selectedVillageId,
                postalCode,
            });
        }
    }, [selectedProvinceId, selectedCityId, selectedDistrictId, selectedVillageId, postalCode, onLocationChange]);

    async function fetchProvinces() {
        try {
            setIsLoadingProvinces(true);
            const res = await fetch('/api/locations/provinces');
            if (!res.ok) throw new Error('Failed to fetch provinces');
            const data = await res.json();
            setProvinces(data);
        } catch (error) {
            console.error('Error fetching provinces:', error);
        } finally {
            setIsLoadingProvinces(false);
        }
    }

    async function fetchCities(provinceId: string) {
        try {
            setIsLoadingCities(true);
            const res = await fetch(`/api/locations/cities?provinceId=${provinceId}`);
            if (!res.ok) throw new Error('Failed to fetch cities');
            const data = await res.json();
            setCities(data);
        } catch (error) {
            console.error('Error fetching cities:', error);
        } finally {
            setIsLoadingCities(false);
        }
    }

    async function fetchDistricts(cityId: string) {
        try {
            setIsLoadingDistricts(true);
            const res = await fetch(`/api/locations/districts?cityId=${cityId}`);
            if (!res.ok) throw new Error('Failed to fetch districts');
            const data = await res.json();
            setDistricts(data);
        } catch (error) {
            console.error('Error fetching districts:', error);
        } finally {
            setIsLoadingDistricts(false);
        }
    }

    async function fetchVillages(districtId: string) {
        try {
            setIsLoadingVillages(true);
            const res = await fetch(`/api/locations/villages?districtId=${districtId}`);
            if (!res.ok) throw new Error('Failed to fetch villages');
            const data = await res.json();
            setVillages(data);
        } catch (error) {
            console.error('Error fetching villages:', error);
        } finally {
            setIsLoadingVillages(false);
        }
    }

    async function fetchPostalCode(districtName: string) {
        try {
            setIsFetchingPostalCode(true);
            const res = await fetch(`/api/postal-code/search?district=${encodeURIComponent(districtName)}`);
            if (!res.ok) throw new Error('Failed to fetch postal code');
            const data = await res.json();

            if (data.postalCodes && data.postalCodes.length > 0) {
                setPostalCode(data.postalCodes[0]);
                setPostalCodeSource('api');
            } else {
                setPostalCodeSource('manual');
            }
        } catch (error) {
            console.error('Error fetching postal code:', error);
            setPostalCodeSource('manual');
        } finally {
            setIsFetchingPostalCode(false);
        }
    }

    function handlePostalCodeChange(value: string) {
        // Only allow 5 digits
        const cleaned = value.replace(/\D/g, '').slice(0, 5);
        setPostalCode(cleaned);
        if (postalCodeSource === 'api' && cleaned !== postalCode) {
            setPostalCodeSource('manual');
        }
    }

    if (isLoadingProvinces) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="ml-2 text-sm text-gray-500">Memuat data lokasi...</span>
            </div>
        );
    }

    if (provinces.length === 0) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-sm font-medium text-yellow-800">Area Belum Tersedia</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                        Maaf, saat ini belum ada area coverage yang tersedia. Silakan hubungi admin.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Province */}
            <div>
                <label htmlFor="province" className="block text-sm font-medium text-gray-700 mb-1">
                    Provinsi <span className="text-red-500">*</span>
                </label>
                <select
                    id="province"
                    value={selectedProvinceId}
                    onChange={(e) => {
                        setSelectedProvinceId(e.target.value);
                        setSelectedProvinceId(e.target.value);
                        setSelectedCityId('');
                        setSelectedDistrictId('');
                        setSelectedVillageId('');
                        setPostalCode('');
                    }}
                    required
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                >
                    <option value="">Pilih Provinsi</option>
                    {provinces.map((province) => (
                        <option key={province.id} value={province.id}>
                            {province.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* City */}
            <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    Kota/Kabupaten <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <select
                        id="city"
                        value={selectedCityId}
                        onChange={(e) => {
                            setSelectedCityId(e.target.value);
                            setSelectedCityId(e.target.value);
                            setSelectedDistrictId('');
                            setSelectedVillageId('');
                            setPostalCode('');
                        }}
                        disabled={!selectedProvinceId || isLoadingCities}
                        required
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        <option value="">
                            {isLoadingCities ? 'Memuat...' : 'Pilih Kota/Kabupaten'}
                        </option>
                        {cities.map((city) => (
                            <option key={city.id} value={city.id}>
                                {city.name}
                            </option>
                        ))}
                    </select>
                    {isLoadingCities && (
                        <Loader2 className="absolute right-8 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                    )}
                </div>
            </div>

            {/* District */}
            <div>
                <label htmlFor="district" className="block text-sm font-medium text-gray-700 mb-1">
                    Kecamatan <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <select
                        id="district"
                        value={selectedDistrictId}
                        onChange={(e) => {
                            setSelectedDistrictId(e.target.value);
                            setSelectedVillageId('');
                        }}
                        disabled={!selectedCityId || isLoadingDistricts}
                        required
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        <option value="">
                            {isLoadingDistricts ? 'Memuat...' : 'Pilih Kecamatan'}
                        </option>
                        {districts.map((district) => (
                            <option key={district.id} value={district.id}>
                                {district.name}
                            </option>
                        ))}
                    </select>
                    {isLoadingDistricts && (
                        <Loader2 className="absolute right-8 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                    )}
                </div>
            </div>

            {/* Village */}
            <div>
                <label htmlFor="village" className="block text-sm font-medium text-gray-700 mb-1">
                    Kelurahan / Desa <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <select
                        id="village"
                        value={selectedVillageId}
                        onChange={(e) => setSelectedVillageId(e.target.value)}
                        disabled={!selectedDistrictId || isLoadingVillages}
                        required
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border disabled:bg-gray-100 disabled:text-gray-400"
                    >
                        <option value="">
                            {isLoadingVillages ? 'Memuat...' : 'Pilih Kelurahan / Desa'}
                        </option>
                        {villages.map((village) => (
                            <option key={village.id} value={village.id}>
                                {village.name}
                            </option>
                        ))}
                    </select>
                    {isLoadingVillages && (
                        <Loader2 className="absolute right-8 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                    )}
                </div>
            </div>

            {/* Postal Code */}
            <div>
                <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Kode Pos <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                    <input
                        type="text"
                        id="postalCode"
                        value={postalCode}
                        onChange={(e) => handlePostalCodeChange(e.target.value)}
                        placeholder="Contoh: 95371"
                        maxLength={5}
                        required
                        disabled={isFetchingPostalCode}
                        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border disabled:bg-gray-100"
                    />
                    {isFetchingPostalCode && (
                        <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-gray-400" />
                    )}
                </div>
                {postalCodeSource === 'api' && postalCode && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Kode pos terverifikasi
                    </p>
                )}
                {postalCodeSource === 'manual' && postalCode && postalCode.length === 5 && (
                    <p className="mt-1 text-xs text-yellow-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Kode pos belum terverifikasi. Pastikan kode pos benar.
                    </p>
                )}
                {postalCode && postalCode.length > 0 && postalCode.length < 5 && (
                    <p className="mt-1 text-xs text-gray-500">
                        Kode pos harus 5 digit
                    </p>
                )}
            </div>

            {/* Hidden inputs for form submission */}
            <input type="hidden" name="provinceId" value={selectedProvinceId} />
            <input type="hidden" name="cityId" value={selectedCityId} />
            <input type="hidden" name="districtId" value={selectedDistrictId} />
            <input type="hidden" name="villageId" value={selectedVillageId} />
            <input type="hidden" name="postalCode" value={postalCode} />
        </div>
    );
}
