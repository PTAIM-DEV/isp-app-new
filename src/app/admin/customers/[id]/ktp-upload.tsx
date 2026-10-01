'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { updateCustomerKTP } from '../actions';

interface KTPUploadProps {
    customerId: string;
    currentKtpUrl: string | null;
    onSuccess?: () => void;
}

export function KTPUpload({ customerId, currentKtpUrl, onSuccess }: KTPUploadProps) {
    const [preview, setPreview] = useState<string | null>(currentKtpUrl);
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

            const response = await fetch('/api/upload/ktp', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            
            // Update customer KTP URL in database
            const result = await updateCustomerKTP(customerId, data.url);
            
            if (!result.success) {
                throw new Error(result.error || 'Failed to update KTP');
            }

            setSuccess(true);
            setPreview(data.url); // Update preview with actual URL
            
            if (onSuccess) {
                onSuccess();
            }
            
            // Reload page after 1 second to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (err) {
            console.error('Upload error:', err);
            setError(err instanceof Error ? err.message : 'Gagal mengupload gambar. Silakan coba lagi.');
            setPreview(currentKtpUrl); // Revert to current image
        } finally {
            setUploading(false);
        }
    }

    function handleRemove() {
        setPreview(null);
        setError(null);
        setSuccess(false);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
        <div className="space-y-2">
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                {preview ? (
                    <div className="space-y-3 text-center">
                        <div className="relative inline-block">
                            <img
                                src={preview}
                                alt="KTP Preview"
                                className="max-h-64 mx-auto rounded-lg shadow-md"
                            />
                            {uploading && (
                                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-center space-x-3">
                            <label
                                htmlFor="ktp-upload-admin"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-3 py-2 border border-gray-300"
                            >
                                <span>Ganti Foto</span>
                                <input
                                    id="ktp-upload-admin"
                                    name="ktp-upload-admin"
                                    type="file"
                                    className="sr-only"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    ref={fileInputRef}
                                    disabled={uploading}
                                />
                            </label>
                            <button
                                type="button"
                                onClick={handleRemove}
                                disabled={uploading}
                                className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                <X className="h-4 w-4 inline mr-1" />
                                Hapus
                            </button>
                        </div>
                        {success && (
                            <p className="text-sm text-green-600">Foto KTP berhasil diupload!</p>
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
                                htmlFor="ktp-upload-admin"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500 px-2"
                            >
                                <span>Upload file</span>
                                <input
                                    id="ktp-upload-admin"
                                    name="ktp-upload-admin"
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

