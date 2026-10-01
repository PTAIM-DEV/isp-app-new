'use client';

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
    onEnd: (dataUrl: string) => void;
}

export function SignaturePad({ onEnd }: SignaturePadProps) {
    const sigPad = useRef<SignatureCanvas>(null);
    const [isEmpty, setIsEmpty] = useState(true);

    function clear() {
        sigPad.current?.clear();
        setIsEmpty(true);
        onEnd('');
    }

    function handleEnd() {
        if (sigPad.current) {
            if (sigPad.current.isEmpty()) {
                setIsEmpty(true);
                onEnd('');
            } else {
                setIsEmpty(false);
                const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
                onEnd(dataUrl);
            }
        }
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                    Tanda Tangan Digital
                </label>
                <button
                    type="button"
                    onClick={clear}
                    className="text-xs text-red-600 flex items-center hover:text-red-800"
                >
                    <Eraser className="h-3 w-3 mr-1" />
                    Hapus
                </button>
            </div>

            <div className="border border-gray-300 rounded-md bg-white overflow-hidden">
                <SignatureCanvas
                    ref={sigPad}
                    penColor="black"
                    canvasProps={{
                        className: 'w-full h-40 cursor-crosshair',
                        style: { width: '100%', height: '160px' }
                    }}
                    onEnd={handleEnd}
                />
            </div>

            <p className="text-xs text-gray-500">
                Silakan tanda tangan di dalam kotak di atas.
            </p>
        </div>
    );
}
