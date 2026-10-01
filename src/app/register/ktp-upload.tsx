'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';

interface KTPUploadProps {
    onUploadComplete: (url: string) => void;
}

export function KTPUpload({ onUploadComplete }: KTPUploadProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
        setUploading(true);

        // Create local preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload/ktp', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            onUploadComplete(data.url);
        } catch (err) {
            console.error('Upload error:', err);
            setError('Gagal mengupload gambar. Silakan coba lagi.');
            setPreview(null);
        } finally {
            setUploading(false);
        }
    }

    function handleRemove() {
        setPreview(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        onUploadComplete(''); // Clear value in parent
    }

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                Foto KTP / Identitas
            </label>

            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-indigo-400 transition-colors relative bg-gray-50">
                {preview ? (
                    <div className="relative w-full">
                        <img
                            src={preview}
                            alt="KTP Preview"
                            className="mx-auto h-48 object-contain rounded-md"
                        />
                        <button
                            type="button"
                            onClick={handleRemove}
                            className="absolute top-0 right-0 -mt-2 -mr-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 shadow-sm"
                        >
                            <X className="h-4 w-4" />
                        </button>
                        {uploading && (
                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-md">
                                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-1 text-center">
                        {uploading ? (
                            <Loader2 className="mx-auto h-12 w-12 text-gray-400 animate-spin" />
                        ) : (
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        )}
                        <div className="flex text-sm text-gray-600 justify-center">
                            <label
                                htmlFor="ktp-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-2"
                            >
                                <span>Upload file</span>
                                <input
                                    id="ktp-upload"
                                    name="ktp-upload"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    disabled={uploading}
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
