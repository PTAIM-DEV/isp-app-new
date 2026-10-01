'use client';

import { useState } from 'react';

interface ImageViewerProps {
    src: string;
    alt: string;
    className?: string;
    maxHeight?: string;
    downloadFileName?: string;
    downloadLabel?: string;
    showDownload?: boolean;
}

export function ImageViewer({ 
    src, 
    alt, 
    className = '', 
    maxHeight = 'max-h-96',
    downloadFileName,
    downloadLabel = 'Download',
    showDownload = false
}: ImageViewerProps) {
    const [imageError, setImageError] = useState(false);
    const [imageSrc, setImageSrc] = useState(src);

    const handleError = () => {
        setImageError(true);
    };

    if (imageError) {
        return (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Gagal memuat gambar</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                <img
                    src={imageSrc}
                    alt={alt}
                    className={`w-full h-auto ${maxHeight} object-contain ${className}`}
                    onError={handleError}
                />
            </div>
            {showDownload && imageSrc && (
                <a
                    href={imageSrc}
                    download={downloadFileName}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {downloadLabel}
                </a>
            )}
        </div>
    );
}


