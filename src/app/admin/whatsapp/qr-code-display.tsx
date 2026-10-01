'use client';

import { useState } from 'react';

interface QRCodeDisplayProps {
    qrCode: string | null;
}

export default function QRCodeDisplay({ qrCode }: QRCodeDisplayProps) {
    const [imageError, setImageError] = useState(false);

    if (!qrCode) {
        return (
            <div className="text-yellow-600 space-y-2">
                <p className="text-sm">Menunggu QR Code di-generate...</p>
                <p className="text-xs text-gray-400">Pastikan worker sedang berjalan</p>
            </div>
        );
    }

    if (imageError) {
        return (
            <div className="text-red-600 space-y-2">
                <p className="text-sm">Error loading QR Code</p>
                <p className="text-xs text-gray-400">QR Code mungkin sudah expired. Silakan refresh halaman.</p>
            </div>
        );
    }

    return (
        <>
            <p className="text-sm text-gray-500">Scan QR Code ini dengan WhatsApp Anda untuk menghubungkan.</p>
            <p className="text-xs text-gray-400">Buka WhatsApp → Settings → Linked Devices → Link a Device</p>
            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 shadow-sm">
                <img 
                    src={qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-64 h-64"
                    onError={() => {
                        console.error('QR Code image failed to load');
                        setImageError(true);
                    }}
                />
            </div>
            <p className="text-xs text-gray-400">QR Code akan expire dalam beberapa menit</p>
        </>
    );
}
















