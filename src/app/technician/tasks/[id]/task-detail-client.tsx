'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Clock, User, CheckCircle, XCircle, Loader2, Camera, Navigation } from 'lucide-react';

interface Task {
    id: string;
    type: 'INSTALLATION' | 'MAINTENANCE';
    scheduledDate: string | null;
    startedDate: string | null;
    completedDate: string | null;
    status: string;
    priority: string;
    taskType: string;
    checkInTime?: string;
    picName?: string;
    picPhone?: string;
    teamName?: string;
    customer: {
        id: string;
        name: string;
        phone: string;
        address?: string;
        latitude?: number;
        longitude?: number;
        province?: { name: string };
        city?: { name: string };
        district?: { name: string };
        village?: { name: string };
        subscription?: { planName: string };
    };
    notes?: string;
    locationNotes?: string;
    checkInLatitude?: number;
    checkInLongitude?: number;
}

interface Technician {
    id: string;
    name: string;
}

interface TaskDetailClientProps {
    taskId: string;
    technician: Technician;
}

export function TaskDetailClient({ taskId, technician }: TaskDetailClientProps) {
    const router = useRouter();
    const [task, setTask] = useState<Task | null>(null);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    const [completing, setCompleting] = useState(false);
    const [showCompletionForm, setShowCompletionForm] = useState(false);

    // Completion form state
    const [completionStatus, setCompletionStatus] = useState<'SUCCESS' | 'FAILED' | 'NEEDS_FOLLOWUP'>('SUCCESS');
    const [description, setDescription] = useState('');
    const [materialsUsed, setMaterialsUsed] = useState('');
    const [timeSpent, setTimeSpent] = useState('');
    const [issuesFound, setIssuesFound] = useState('');
    const [recommendations, setRecommendations] = useState('');
    const [photos, setPhotos] = useState<File[]>([]);
    const [photoUrls, setPhotoUrls] = useState<string[]>([]);
    const [uploadingPhotos, setUploadingPhotos] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
    const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [gpsError, setGpsError] = useState('');

    useEffect(() => {
        loadTask();
        getCurrentLocation();
    }, [taskId]);

    async function loadTask() {
        try {
            setLoading(true);
            const res = await fetch(`/api/technician/tasks/${taskId}`);
            if (!res.ok) throw new Error('Failed to load task');
            const data = await res.json();
            setTask(data);
            if (data.status === 'IN_PROGRESS') {
                setShowCompletionForm(true);
            }
        } catch (error) {
            console.error('Error loading task:', error);
        } finally {
            setLoading(false);
        }
    }

    async function getCurrentLocation() {
        if (!navigator.geolocation) {
            setGpsError('Geolocation tidak didukung oleh browser');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setGpsLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                });
            },
            (error) => {
                setGpsError('Gagal mendapatkan lokasi GPS: ' + error.message);
            }
        );
    }

    async function handleStartTask() {
        try {
            setStarting(true);
            const res = await fetch(`/api/technician/tasks/${taskId}/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    latitude: gpsLocation?.lat,
                    longitude: gpsLocation?.lng,
                }),
            });

            if (!res.ok) throw new Error('Failed to start task');
            await loadTask();
        } catch (error) {
            console.error('Error starting task:', error);
            alert('Gagal memulai tugas');
        } finally {
            setStarting(false);
        }
    }

    async function uploadPhotos(): Promise<string[]> {
        if (photos.length === 0) return [];

        setUploadingPhotos(true);
        const uploadedUrls: string[] = [];

        try {
            for (let i = 0; i < photos.length; i++) {
                const photo = photos[i];
                const formData = new FormData();
                formData.append('file', photo);

                setUploadProgress(prev => ({ ...prev, [i]: 0 }));

                const res = await fetch('/api/upload/task-photo', {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || `Failed to upload photo ${i + 1}`);
                }

                const data = await res.json();
                uploadedUrls.push(data.url);
                setUploadProgress(prev => ({ ...prev, [i]: 100 }));
            }

            return uploadedUrls;
        } catch (error) {
            console.error('Error uploading photos:', error);
            throw error;
        } finally {
            setUploadingPhotos(false);
            setUploadProgress({});
        }
    }

    async function handleCompleteTask(e: React.FormEvent) {
        e.preventDefault();
        try {
            setCompleting(true);

            // Upload photos first if any
            let uploadedPhotoUrls: string[] = [];
            if (photos.length > 0) {
                uploadedPhotoUrls = await uploadPhotos();
            }

            const res = await fetch(`/api/technician/tasks/${taskId}/complete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: completionStatus,
                    description,
                    materialsUsed,
                    timeSpent: timeSpent ? parseInt(timeSpent) : null,
                    issuesFound,
                    recommendations,
                    photos: uploadedPhotoUrls,
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to complete task');
            }

            alert('Tugas berhasil diselesaikan!');
            router.push('/technician/dashboard');
        } catch (error: any) {
            console.error('Error completing task:', error);
            alert(error.message || 'Gagal menyelesaikan tugas');
        } finally {
            setCompleting(false);
        }
    }

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'URGENT': return 'bg-red-100 text-red-800';
            case 'HIGH': return 'bg-orange-100 text-orange-800';
            case 'NORMAL': return 'bg-blue-100 text-blue-800';
            case 'LOW': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
            case 'PENDING': return 'bg-gray-100 text-gray-800';
            case 'FAILED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-indigo-600 mx-auto" />
                    <p className="mt-2 text-gray-500">Memuat detail tugas...</p>
                </div>
            </div>
        );
    }

    if (!task) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-500">Tugas tidak ditemukan</p>
                    <button
                        onClick={() => router.push('/technician/dashboard')}
                        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                    >
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <button
                        onClick={() => router.back()}
                        className="text-indigo-600 hover:text-indigo-800 mb-4"
                    >
                        ← Kembali
                    </button>
                    <div className="flex items-center justify-between">
                        <h1 className="text-2xl font-bold text-gray-900">Detail Tugas</h1>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
                            {task.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Task Info */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Customer Info */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                <User className="w-5 h-5 mr-2" />
                                Informasi Pelanggan
                            </h2>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-sm text-gray-500">Nama</p>
                                    <p className="text-lg font-medium text-gray-900">{task.customer.name}</p>
                                </div>
                                <div className="flex items-center">
                                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                    <a href={`tel:${task.customer.phone}`} className="text-indigo-600 hover:text-indigo-800">
                                        {task.customer.phone}
                                    </a>

                                </div>
                                <div className="flex items-center">
                                    <span className="text-gray-400 text-sm w-4 mr-2">PIC:</span>
                                    <p className="text-gray-900">{task.picName || task.customer.name}</p>
                                </div>
                                {task.picPhone && (
                                    <div className="flex items-center">
                                        <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                        <a href={`tel:${task.picPhone}`} className="text-indigo-600 hover:text-indigo-800">
                                            {task.picPhone}
                                        </a>
                                    </div>
                                )}
                                {task.customer.subscription?.planName && (
                                    <div className="mt-2 text-sm bg-blue-50 p-2 rounded text-blue-800">
                                        <strong>Plan:</strong> {task.customer.subscription.planName}
                                    </div>
                                )}
                                {task.customer.address && (
                                    <div className="flex items-start">
                                        <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-1" />
                                        <div>
                                            <p className="text-gray-900">{task.customer.address}</p>
                                            {task.customer.village && (
                                                <p className="text-sm text-gray-500">
                                                    {task.customer.village.name}, {task.customer.district?.name}, {task.customer.city?.name}, {task.customer.province?.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                {task.customer.latitude && task.customer.longitude && (
                                    <a
                                        href={`https://www.google.com/maps?q=${task.customer.latitude},${task.customer.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center text-indigo-600 hover:text-indigo-800"
                                    >
                                        <Navigation className="w-4 h-4 mr-2" />
                                        Buka di Google Maps
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Task Details */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Detail Tugas</h2>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-2">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                        {task.priority}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        {task.type === 'INSTALLATION' ? 'Instalasi' : 'Maintenance'} - {task.taskType}
                                    </span>
                                </div>
                                {task.teamName && (
                                    <div className="text-sm text-gray-600 font-medium">
                                        Team: {task.teamName}
                                    </div>
                                )}
                                {task.scheduledDate && (
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                        <p className="text-gray-900">
                                            {new Date(task.scheduledDate).toLocaleString('id-ID', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </p>
                                    </div>
                                )}
                                {task.locationNotes && (
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Catatan Lokasi</p>
                                        <p className="text-gray-900">{task.locationNotes}</p>
                                    </div>
                                )}
                                {task.notes && (
                                    <div>
                                        <p className="text-sm text-gray-500 mb-1">Catatan</p>
                                        <p className="text-gray-900">{task.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* GPS Check-in Status */}
                        {task.checkInTime && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <Navigation className="w-5 h-5 mr-2" />
                                    Check-in Lokasi
                                </h2>
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500">
                                        Waktu: {new Date(task.checkInTime).toLocaleString('id-ID')}
                                    </p>
                                    {task.checkInLatitude && task.checkInLongitude && (
                                        <p className="text-sm text-gray-500">
                                            Koordinat: {task.checkInLatitude.toFixed(6)}, {task.checkInLongitude.toFixed(6)}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Completion Form */}
                        {showCompletionForm && (
                            <div className="bg-white rounded-lg shadow p-6">
                                <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                                    <CheckCircle className="w-5 h-5 mr-2" />
                                    Laporan Penyelesaian
                                </h2>
                                <form onSubmit={handleCompleteTask} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Status Penyelesaian <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={completionStatus}
                                            onChange={(e) => setCompletionStatus(e.target.value as any)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            required
                                        >
                                            <option value="SUCCESS">Berhasil</option>
                                            <option value="FAILED">Gagal</option>
                                            <option value="NEEDS_FOLLOWUP">Perlu Follow-up</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Deskripsi Pekerjaan <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            rows={4}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            placeholder="Jelaskan pekerjaan yang telah dilakukan..."
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Material/Peralatan yang Digunakan
                                        </label>
                                        <input
                                            type="text"
                                            value={materialsUsed}
                                            onChange={(e) => setMaterialsUsed(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            placeholder="Contoh: Kabel UTP 50m, Connector RJ45..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Waktu yang Dibutuhkan (menit)
                                        </label>
                                        <input
                                            type="number"
                                            value={timeSpent}
                                            onChange={(e) => setTimeSpent(e.target.value)}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            placeholder="60"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Masalah yang Ditemukan
                                        </label>
                                        <textarea
                                            value={issuesFound}
                                            onChange={(e) => setIssuesFound(e.target.value)}
                                            rows={3}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            placeholder="Jelaskan masalah yang ditemukan (jika ada)..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Rekomendasi
                                        </label>
                                        <textarea
                                            value={recommendations}
                                            onChange={(e) => setRecommendations(e.target.value)}
                                            rows={3}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            placeholder="Rekomendasi untuk pelanggan atau tim..."
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Foto (opsional)
                                        </label>
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files) {
                                                    const files = Array.from(e.target.files);
                                                    // Limit to 10 photos
                                                    if (files.length > 10) {
                                                        alert('Maksimal 10 foto per tugas');
                                                        setPhotos(files.slice(0, 10));
                                                    } else {
                                                        setPhotos(files);
                                                    }
                                                }
                                            }}
                                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                                            disabled={uploadingPhotos || completing}
                                        />
                                        {photos.length > 0 && (
                                            <div className="mt-2 space-y-2">
                                                <p className="text-sm text-gray-600">
                                                    {photos.length} foto dipilih
                                                </p>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                                    {photos.map((photo, index) => (
                                                        <div key={index} className="relative">
                                                            <img
                                                                src={URL.createObjectURL(photo)}
                                                                alt={`Preview ${index + 1}`}
                                                                className="w-full h-24 object-cover rounded border border-gray-200"
                                                            />
                                                            {uploadProgress[index] !== undefined && (
                                                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                                                                    <div className="text-white text-xs">
                                                                        {uploadProgress[index]}%
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setPhotos(prev => prev.filter((_, i) => i !== index));
                                                                }}
                                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600"
                                                                disabled={uploadingPhotos || completing}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                {uploadingPhotos && (
                                                    <div className="flex items-center text-sm text-indigo-600">
                                                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                                        Mengunggah foto...
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end space-x-3 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowCompletionForm(false)}
                                            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={completing || uploadingPhotos}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
                                        >
                                            {(completing || uploadingPhotos) ? (
                                                <>
                                                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                                    {uploadingPhotos ? 'Mengunggah foto...' : 'Menyimpan...'}
                                                </>
                                            ) : (
                                                'Selesaikan Tugas'
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Actions */}
                    <div className="space-y-6">
                        {/* Action Buttons */}
                        <div className="bg-white rounded-lg shadow p-6">
                            <h2 className="text-lg font-medium text-gray-900 mb-4">Aksi</h2>
                            <div className="space-y-3">
                                {task.status === 'PENDING' && (
                                    <>
                                        {gpsLocation ? (
                                            <button
                                                onClick={handleStartTask}
                                                disabled={starting}
                                                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
                                            >
                                                {starting ? (
                                                    <>
                                                        <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                                        Memulai...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Navigation className="w-4 h-4 mr-2" />
                                                        Mulai Tugas (GPS: {gpsLocation.lat.toFixed(4)}, {gpsLocation.lng.toFixed(4)})
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                                <p className="text-sm text-yellow-800">
                                                    {gpsError || 'Mengambil lokasi GPS...'}
                                                </p>
                                                <button
                                                    onClick={getCurrentLocation}
                                                    className="mt-2 text-sm text-yellow-800 underline"
                                                >
                                                    Coba Lagi
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                                {task.status === 'IN_PROGRESS' && !showCompletionForm && (
                                    <button
                                        onClick={() => setShowCompletionForm(true)}
                                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                                    >
                                        <CheckCircle className="w-4 h-4 inline mr-2" />
                                        Selesaikan Tugas
                                    </button>
                                )}
                                {task.status === 'COMPLETED' && (
                                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                                        <p className="text-sm text-green-800 flex items-center">
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Tugas sudah selesai
                                        </p>
                                        {task.completedDate && (
                                            <p className="text-xs text-green-700 mt-1">
                                                {new Date(task.completedDate).toLocaleString('id-ID')}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}

