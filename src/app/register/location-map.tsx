'use client';

import { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation } from 'lucide-react';

interface LocationMapProps {
    onLocationSelect: (lat: number, lng: number) => void;
    initialLat?: number;
    initialLng?: number;
}

export function LocationMap({ onLocationSelect, initialLat, initialLng }: LocationMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(
        initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if script already exists
        if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
            initMap();
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

        return () => {
            // Don't remove script on unmount to prevent reload issues if component remounts
            // document.head.removeChild(script);
        };
    }, []);

    function initMap() {
        if (!mapRef.current || !window.google) return;
        if (map) return; // Map already initialized

        // Default to Sulawesi Utara center (Manado) instead of Jakarta
        const defaultCenter = {
            lat: initialLat || 1.4748,
            lng: initialLng || 124.8426
        };

        const mapInstance = new window.google.maps.Map(mapRef.current, {
            center: defaultCenter,
            zoom: 15,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
        });

        // Add marker
        const markerInstance = new window.google.maps.Marker({
            position: defaultCenter,
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

        // Set initial coordinates if provided
        if (initialLat && initialLng) {
            setCoordinates({ lat: initialLat, lng: initialLng });
            onLocationSelect(initialLat, initialLng);
        } else {
            // Set default coordinates even if not provided initially
            // This ensures the hidden input has a value
            setCoordinates({ lat: defaultCenter.lat, lng: defaultCenter.lng });
            onLocationSelect(defaultCenter.lat, defaultCenter.lng);
        }
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
