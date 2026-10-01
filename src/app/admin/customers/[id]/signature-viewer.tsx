'use client';

import { ImageViewer } from './image-viewer';

interface SignatureViewerProps {
    signatureData: string | null;
}

export function SignatureViewer({ signatureData }: SignatureViewerProps) {
    if (!signatureData) {
        return (
            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Tanda tangan belum tersedia</p>
            </div>
        );
    }

    return (
        <ImageViewer
            src={signatureData}
            alt="Tanda Tangan"
            className="bg-white"
            maxHeight="max-h-48"
            downloadFileName="signature.png"
            downloadLabel="Download Tanda Tangan"
            showDownload={true}
        />
    );
}


