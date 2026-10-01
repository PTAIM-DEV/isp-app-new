'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';

// Types for Google Maps (loaded dynamically)
declare global {
  interface Window {
    google: any;
  }
}

interface EditLocationMapProps {
    onLocationSelect: (lat: number, lng: number) => void;
    initialLat?: number;
    initialLng?: number;
    address?: string;
    districtName?: string;
    cityName?: string;
    provinceName?: string;
}

export function EditLocationMap({ 
    onLocationSelect, 
    initialLat, 
    initialLng,
    address,
    districtName,
    cityName,
    provinceName
}: EditLocationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );
    const [loading, setLoading] = useState(false);
    const [geocodingStatus, setGeocodingStatus] = useState<string>('');

    // Load Google Maps script once
    useEffect(() => {
        if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
            // Script already loaded, initialize map
            setTimeout(() => {
                initMap();
            }, 100);
            return;
        }

        // Load Google Maps script
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyB8DQ-8XYQkMNBhs0SbCBE2aULTfZ6btqw&libraries=places`;
        script.async = true;
        script.defer = true;

        script.onload = () => {
            initMap();
        };

        document.head.appendChild(script);
    }, []);

    // Update map when location data changes
    useEffect(() => {
        if (map && marker && window.google) {
            // Skip if we have initial coordinates (user already set location)
            if (initialLat && initialLng) {
                return;
            }
            // Add delay to ensure props are updated
            const timeoutId = setTimeout(() => {
                updateMapLocation();
            }, 300);
            return () => clearTimeout(timeoutId);
        }
    }, [address, districtName, cityName, provinceName]);

    // Listen for location change events from dropdowns
    useEffect(() => {
        const handleLocationChange = () => {
            if (map && marker && window.google) {
                // Small delay to ensure state is updated
                setTimeout(() => {
                    updateMapLocation();
                }, 200);
            }
        };

        window.addEventListener('locationChanged', handleLocationChange);
        return () => {
            window.removeEventListener('locationChanged', handleLocationChange);
        };
    }, [map, marker, address, districtName, cityName, provinceName]);

    async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
        if (!window.google || !window.google.maps) return null;

        return new Promise((resolve) => {
            const geocoder = new window.google.maps.Geocoder();
            geocoder.geocode({ address: query }, (results: any, status: string) => {
                if (status === 'OK' && results && results[0]) {
                    const location = results[0].geometry.location;
                    resolve({
                        lat: location.lat(),
                        lng: location.lng()
                    });
                } else {
                    resolve(null);
                }
            });
        });
    }

    async function updateMapLocation() {
        if (!map || !marker || !window.google) {
            console.log('Map or marker not ready');
            return;
        }

        console.log('Updating map location:', { address, districtName, cityName, provinceName });

        // Default to Sulawesi Utara center (Manado) instead of Jakarta
        // Coordinates: Manado, Sulawesi Utara
        let center = { lat: initialLat || 1.4748, lng: initialLng || 124.8426 };
        let zoom = 15;
        let status = '';

        // Skip if we have initial coordinates (user already set location manually)
        if (initialLat && initialLng) {
            console.log('Using saved coordinates');
            return;
        }

        // Try to geocode based on location data
        {
            // Try to geocode address first
            if (address && address.trim()) {
                setLoading(true);
                setGeocodingStatus('Mencari lokasi berdasarkan alamat...');
                
                const addressCoords = await geocodeAddress(address);
                
                if (addressCoords) {
                    center = addressCoords;
                    zoom = 16;
                    status = 'Lokasi ditemukan berdasarkan alamat';
                } else {
                    // If address geocoding fails, try district
                    if (districtName) {
                        setGeocodingStatus('Mencari lokasi berdasarkan kecamatan...');
                        const districtQuery = `${districtName}${cityName ? `, ${cityName}` : ''}${provinceName ? `, ${provinceName}` : ''}`;
                        const districtCoords = await geocodeAddress(districtQuery);
                        
                        if (districtCoords) {
                            center = districtCoords;
                            zoom = 13;
                            status = 'Lokasi ditemukan berdasarkan kecamatan';
                        } else if (cityName) {
                            // Try city if district fails
                            setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                            const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                            const cityCoords = await geocodeAddress(cityQuery);
                            
                            if (cityCoords) {
                                center = cityCoords;
                                zoom = 12;
                                status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                            } else {
                                status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                            }
                        } else {
                            status = 'Alamat tidak ditemukan, menggunakan koordinat default';
                        }
                    } else if (cityName) {
                        // Try city if no district
                        setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                        const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                        const cityCoords = await geocodeAddress(cityQuery);
                        
                        if (cityCoords) {
                            center = cityCoords;
                            zoom = 12;
                            status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                        } else {
                            status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                        }
                    } else {
                        status = 'Tidak ada informasi lokasi, menggunakan koordinat default';
                    }
                }
                
                setLoading(false);
            } else {
                // No address, try district or city
                if (districtName) {
                    setLoading(true);
                    setGeocodingStatus('Mencari lokasi berdasarkan kecamatan...');
                    const districtQuery = `${districtName}${cityName ? `, ${cityName}` : ''}${provinceName ? `, ${provinceName}` : ''}`;
                    const districtCoords = await geocodeAddress(districtQuery);
                    
                    if (districtCoords) {
                        center = districtCoords;
                        zoom = 13;
                        status = 'Lokasi ditemukan berdasarkan kecamatan';
                    } else if (cityName) {
                        setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                        const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                        const cityCoords = await geocodeAddress(cityQuery);
                        
                        if (cityCoords) {
                            center = cityCoords;
                            zoom = 12;
                            status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                        } else {
                            status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                        }
                    } else {
                        status = 'Tidak ada informasi lokasi, menggunakan koordinat default';
                    }
                    setLoading(false);
                } else if (cityName) {
                    setLoading(true);
                    setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                    const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                    const cityCoords = await geocodeAddress(cityQuery);
                    
                    if (cityCoords) {
                        center = cityCoords;
                        zoom = 12;
                        status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                    } else {
                        status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                    }
                    setLoading(false);
                }
            }
        }

        setGeocodingStatus(status);

        // Update map center and marker
        map.setCenter(center);
        map.setZoom(zoom);
        marker.setPosition(center);
        setCoordinates(center);
        onLocationSelect(center.lat, center.lng);
    }

    async function initMap() {
        if (!mapRef.current || !window.google) return;
        if (map) return; // Map already initialized

        // Default to Sulawesi Utara center (Manado) instead of Jakarta
        let center = { lat: initialLat || 1.4748, lng: initialLng || 124.8426 };
        let zoom = 15;
        let status = '';

        // If we have initial coordinates, use them
        if (initialLat && initialLng) {
            center = { lat: initialLat, lng: initialLng };
            status = 'Menggunakan koordinat yang tersimpan';
        } else {
            // Try to geocode address first
            if (address && address.trim()) {
                setLoading(true);
                setGeocodingStatus('Mencari lokasi berdasarkan alamat...');
                
                const addressCoords = await geocodeAddress(address);
                
                if (addressCoords) {
                    center = addressCoords;
                    zoom = 16;
                    status = 'Lokasi ditemukan berdasarkan alamat';
                } else {
                    // If address geocoding fails, try district
                    if (districtName) {
                        setGeocodingStatus('Mencari lokasi berdasarkan kecamatan...');
                        const districtQuery = `${districtName}${cityName ? `, ${cityName}` : ''}${provinceName ? `, ${provinceName}` : ''}`;
                        const districtCoords = await geocodeAddress(districtQuery);
                        
                        if (districtCoords) {
                            center = districtCoords;
                            zoom = 13;
                            status = 'Lokasi ditemukan berdasarkan kecamatan';
                        } else if (cityName) {
                            // Try city if district fails
                            setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                            const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                            const cityCoords = await geocodeAddress(cityQuery);
                            
                            if (cityCoords) {
                                center = cityCoords;
                                zoom = 12;
                                status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                            } else {
                                status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                            }
                        } else {
                            status = 'Alamat tidak ditemukan, menggunakan koordinat default';
                        }
                    } else if (cityName) {
                        // Try city if no district
                        setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                        const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                        const cityCoords = await geocodeAddress(cityQuery);
                        
                        if (cityCoords) {
                            center = cityCoords;
                            zoom = 12;
                            status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                        } else {
                            status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                        }
                    } else {
                        status = 'Tidak ada informasi lokasi, menggunakan koordinat default';
                    }
                }
                
                setLoading(false);
            } else {
                // No address, try district or city
                if (districtName) {
                    setLoading(true);
                    setGeocodingStatus('Mencari lokasi berdasarkan kecamatan...');
                    const districtQuery = `${districtName}${cityName ? `, ${cityName}` : ''}${provinceName ? `, ${provinceName}` : ''}`;
                    const districtCoords = await geocodeAddress(districtQuery);
                    
                    if (districtCoords) {
                        center = districtCoords;
                        zoom = 13;
                        status = 'Lokasi ditemukan berdasarkan kecamatan';
                    } else if (cityName) {
                        setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                        const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                        const cityCoords = await geocodeAddress(cityQuery);
                        
                        if (cityCoords) {
                            center = cityCoords;
                            zoom = 12;
                            status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                        } else {
                            status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                        }
                    } else {
                        status = 'Tidak ada informasi lokasi, menggunakan koordinat default';
                    }
                    setLoading(false);
                } else if (cityName) {
                    setLoading(true);
                    setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                    const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                    const cityCoords = await geocodeAddress(cityQuery);
                    
                    if (cityCoords) {
                        center = cityCoords;
                        zoom = 12;
                        status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                    } else {
                        status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                    }
                    setLoading(false);
                }
            }
        }

        setGeocodingStatus(status);

        const mapInstance = new window.google.maps.Map(mapRef.current, {
            center: center,
            zoom: zoom,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
        });

        // Add marker
        const markerInstance = new window.google.maps.Marker({
            position: center,
            map: mapInstance,
            draggable: true,
            title: 'Lokasi Pemasangan'
        });

        // Update coordinates when marker is dragged
        markerInstance.addListener('dragend', () => {
            const position = markerInstance.getPosition();
            if (position) {
                const lat = position.lat();
                const lng = position.lng();
                setCoordinates({ lat, lng });
                onLocationSelect(lat, lng);
            }
        });

        // Add click listener to map
        mapInstance.addListener('click', (e: any) => {
            if (e.latLng) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                markerInstance.setPosition(e.latLng);
                setCoordinates({ lat, lng });
                onLocationSelect(lat, lng);
            }
        });

        setMap(mapInstance);
        setMarker(markerInstance);

        // Set initial coordinates
        setCoordinates(center);
        onLocationSelect(center.lat, center.lng);

        // If no initial coordinates, try to geocode location after map is ready
        if (!initialLat || !initialLng) {
            // Use setTimeout to ensure map is fully initialized
            setTimeout(() => {
                updateMapLocationWithMap(mapInstance, markerInstance);
            }, 500);
        }
    }

    async function updateMapLocationWithMap(mapInstance: any, markerInstance: any) {
        if (!window.google) return;

        // Default to Sulawesi Utara center (Manado) instead of Jakarta
        let center = { lat: initialLat || 1.4748, lng: initialLng || 124.8426 };
        let zoom = 15;
        let status = '';

        // If we have initial coordinates, use them
        if (initialLat && initialLng) {
            center = { lat: initialLat, lng: initialLng };
            status = 'Menggunakan koordinat yang tersimpan';
        } else {
            // Try to geocode address first
            if (address && address.trim()) {
                setLoading(true);
                setGeocodingStatus('Mencari lokasi berdasarkan alamat...');
                
                const addressCoords = await geocodeAddress(address);
                
                if (addressCoords) {
                    center = addressCoords;
                    zoom = 16;
                    status = 'Lokasi ditemukan berdasarkan alamat';
                } else {
                    // If address geocoding fails, try district
                    if (districtName) {
                        setGeocodingStatus('Mencari lokasi berdasarkan kecamatan...');
                        const districtQuery = `${districtName}${cityName ? `, ${cityName}` : ''}${provinceName ? `, ${provinceName}` : ''}`;
                        const districtCoords = await geocodeAddress(districtQuery);
                        
                        if (districtCoords) {
                            center = districtCoords;
                            zoom = 13;
                            status = 'Lokasi ditemukan berdasarkan kecamatan';
                        } else if (cityName) {
                            // Try city if district fails
                            setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                            const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                            const cityCoords = await geocodeAddress(cityQuery);
                            
                            if (cityCoords) {
                                center = cityCoords;
                                zoom = 12;
                                status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                            } else {
                                status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                            }
                        } else {
                            status = 'Alamat tidak ditemukan, menggunakan koordinat default';
                        }
                    } else if (cityName) {
                        // Try city if no district
                        setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                        const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                        const cityCoords = await geocodeAddress(cityQuery);
                        
                        if (cityCoords) {
                            center = cityCoords;
                            zoom = 12;
                            status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                        } else {
                            status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                        }
                    } else {
                        status = 'Tidak ada informasi lokasi, menggunakan koordinat default';
                    }
                }
                
                setLoading(false);
            } else {
                // No address, try district or city
                if (districtName) {
                    setLoading(true);
                    setGeocodingStatus('Mencari lokasi berdasarkan kecamatan...');
                    const districtQuery = `${districtName}${cityName ? `, ${cityName}` : ''}${provinceName ? `, ${provinceName}` : ''}`;
                    const districtCoords = await geocodeAddress(districtQuery);
                    
                    if (districtCoords) {
                        center = districtCoords;
                        zoom = 13;
                        status = 'Lokasi ditemukan berdasarkan kecamatan';
                    } else if (cityName) {
                        setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                        const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                        const cityCoords = await geocodeAddress(cityQuery);
                        
                        if (cityCoords) {
                            center = cityCoords;
                            zoom = 12;
                            status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                        } else {
                            status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                        }
                    } else {
                        status = 'Tidak ada informasi lokasi, menggunakan koordinat default';
                    }
                    setLoading(false);
                } else if (cityName) {
                    setLoading(true);
                    setGeocodingStatus('Mencari lokasi berdasarkan kabupaten/kota...');
                    const cityQuery = `${cityName}${provinceName ? `, ${provinceName}` : ''}`;
                    const cityCoords = await geocodeAddress(cityQuery);
                    
                    if (cityCoords) {
                        center = cityCoords;
                        zoom = 12;
                        status = 'Lokasi ditemukan berdasarkan kabupaten/kota';
                    } else {
                        status = 'Lokasi tidak ditemukan, menggunakan koordinat default';
                    }
                    setLoading(false);
                }
            }
        }

        setGeocodingStatus(status);

        // Update map center and marker
        mapInstance.setCenter(center);
        mapInstance.setZoom(zoom);
        markerInstance.setPosition(center);
        setCoordinates(center);
        onLocationSelect(center.lat, center.lng);
    }

    function getCurrentLocation() {
        if (!navigator.geolocation) {
            alert('Geolocation tidak didukung oleh browser Anda');
            return;
        }

        setLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const newPos = { lat, lng };

                if (map && marker) {
                    map.setCenter(newPos);
                    marker.setPosition(newPos);
                    setCoordinates(newPos);
                    onLocationSelect(lat, lng);
                    setGeocodingStatus('Menggunakan lokasi GPS Anda');
                }
                setLoading(false);
            },
            (error) => {
                console.error('Error getting location:', error);
                alert('Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin lokasi diberikan.');
                setLoading(false);
            }
        );
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                    Lokasi Pemasangan
                </label>
                <button
                    type="button"
                    onClick={getCurrentLocation}
                    disabled={loading}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 disabled:opacity-50"
                >
                    <Navigation className="h-3 w-3 mr-1" />
                    {loading ? 'Mengambil...' : 'Lokasi Saya'}
                </button>
            </div>

            {loading && (
                <div className="flex items-center justify-center py-2 bg-blue-50 rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600 mr-2" />
                    <span className="text-xs text-blue-700">{geocodingStatus}</span>
                </div>
            )}

            {geocodingStatus && !loading && (
                <div className="bg-gray-50 rounded-md p-2 text-xs text-gray-600">
                    <span className="font-medium">Info:</span> {geocodingStatus}
                </div>
            )}

            <div
                ref={mapRef}
                className="w-full h-64 rounded-lg border border-gray-300 bg-gray-100"
            />

            {coordinates && (
                <div className="bg-gray-50 rounded-md p-3 text-xs">
                    <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-medium text-gray-700">Koordinat Terpilih:</p>
                            <p className="text-gray-600 mt-1">
                                Latitude: <span className="font-mono">{coordinates.lat.toFixed(6)}</span>
                            </p>
                            <p className="text-gray-600">
                                Longitude: <span className="font-mono">{coordinates.lng.toFixed(6)}</span>
                            </p>
                            <p className="text-gray-500 mt-1 text-xs">
                                💡 Klik peta atau drag marker untuk mengubah lokasi
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <p className="text-xs text-gray-500">
                Klik pada peta atau drag marker merah untuk menentukan lokasi pemasangan yang tepat.
            </p>
        </div>
    );
}

