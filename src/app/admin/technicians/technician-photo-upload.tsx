'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, User } from 'lucide-react';

interface TechnicianPhotoUploadProps {
    currentPhotoUrl: string | null;
    onPhotoChange: (url: string | null) => void;
    disabled?: boolean;
}

export function TechnicianPhotoUpload({ 
    currentPhotoUrl, 
    onPhotoChange,
    disabled = false 
}: TechnicianPhotoUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentPhotoUrl);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Mohon upload file gambar (JPG/PNG)');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('Ukuran file maksimal 5MB');
            return;
        }

        setError(null);
        setSuccess(false);
        setUploading(true);

        // Create local preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload/technician-photo', {
                method: 'POST',
                body: formData,
            });

            // Check if response is JSON
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => {
                    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
                });
                throw new Error(errorData.error || `Upload failed: ${response.status}`);
            }

            const data = await response.json();
            
            setSuccess(true);
            setPreview(data.url);
            onPhotoChange(data.url);
            
            // Clear success message after 2 seconds
            setTimeout(() => {
                setSuccess(false);
            }, 2000);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : 'Gagal mengupload gambar. Silakan coba lagi.');
            setPreview(currentPhotoUrl); // Revert to current image
            onPhotoChange(null);
        } finally {
            setUploading(false);
        }
    }

    function handleRemove() {
        setPreview(null);
        setError(null);
        setSuccess(false);
        onPhotoChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
                Foto Profil / Foto ID
            </label>
            <div className="flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                {preview ? (
                    <div className="space-y-3 text-center w-full">
                        <div className="relative inline-block">
                            <img
                                src={preview}
                                alt="Foto Profil"
                                className="max-h-48 mx-auto rounded-lg shadow-md object-cover"
                            />
                            {uploading && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center space-x-3">
                            <label
                                htmlFor="technician-photo-upload"
                                className={`relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-3 py-2 border border-gray-300 ${
                                    disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                <span>Ganti Foto</span>
                                <input
                                    id="technician-photo-upload"
                                    name="technician-photo-upload"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    disabled={disabled || uploading}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={disabled || uploading}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                <X className="h-4 w-4 inline mr-1" />
                                Hapus
                            </button>
                        </div>
                        {success && (
                            <p className="text-sm text-green-600">Foto berhasil diupload!</p>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1 text-center w-full">
                        {uploading ? (
                            <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                        ) : (
                            <User className="mx-auto h-12 w-12 text-gray-400" />
                        )}
                        <div className="flex text-sm text-gray-600 justify-center">
                            <label
                                htmlFor="technician-photo-upload"
                                className={`relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-2 ${
                                    disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                            >
                                <span>Upload foto</span>
                                <input
                                    id="technician-photo-upload"
                                    name="technician-photo-upload"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    disabled={disabled || uploading}
                                />
                            </label>
                            <p className="pl-1">atau drag and drop</p>
                        </div>
                        <p className="text-xs text-gray-500">
                            PNG, JPG, GIF up to 5MB
                        </p>
                    </div>
                )}
            </div>

            {error && (
                <p className="text-sm text-red-600 mt-1">{error}</p>
            )}
        </div>
    );
}

