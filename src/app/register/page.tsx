'use client';

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { registerUser } from './actions';
import { Loader2 } from 'lucide-react';
import { OTPVerification } from './otp-verification';
import { LocationMap } from './location-map';
import { PackageSelector } from './package-selector';
import { KTPUpload } from './ktp-upload';
import { SignaturePad } from './signature-pad';
import { LocationSelector } from './location-selector';

interface Package {
    id: string;
    name: string;
    speed: string;
    price: number;
    description: string | null;
    features: string;
    isActive: boolean;
    isRecommended: boolean;
}

export default function RegisterPage() {
    const [state, setState] = useState<{ error?: string; success?: boolean } | null>(null);
    const [verifiedPhone, setVerifiedPhone] = useState<string | null>(null);
    const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
    const [packages, setPackages] = useState<Package[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(true);
    const [termsContent, setTermsContent] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    useEffect(() => {
        // Fetch packages
        fetch('/api/packages')
            .then(res => res.json())
            .then(data => {
                setPackages(data);
                setLoadingPackages(false);
            })
            .catch(err => {
                console.error('Error loading packages:', err);
                setLoadingPackages(false);
            });

        // Fetch Terms
        fetch('/api/settings/terms')
            .then(res => res.json())
            .then(data => {
                setTermsContent(data.content);
            })
            .catch(err => console.error('Error loading terms:', err));
    }, []);

    async function handleSubmit(formData: FormData) {
        if (!agreedToTerms) {
            setState({ error: 'Anda harus menyetujui Syarat & Ketentuan Layanan.' });
            return;
        }

        // Add verified phone to form data
        if (verifiedPhone) {
            formData.set('phone', verifiedPhone);
        }
        // Add selected package
        if (selectedPackage) {
            formData.set('selectedPackageId', selectedPackage);
        }
        const result = await registerUser(formData);
        setState(result);
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Pendaftaran Pelanggan Baru
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Daftar sekarang untuk menikmati layanan internet terbaik.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    {state?.success ? (
                        <div className="rounded-md bg-green-50 p-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="ml-3">
                                    <h3 className="text-sm font-medium text-green-800">Pendaftaran Berhasil!</h3>
                                    <div className="mt-2 text-sm text-green-700">
                                        <p>Terima kasih telah mendaftar. Tim kami akan segera menghubungi Anda untuk jadwal survei/instalasi.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : !verifiedPhone ? (
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">
                                Verifikasi Nomor WhatsApp
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Kami akan mengirimkan kode OTP ke nomor WhatsApp Anda untuk verifikasi.
                            </p>
                            <OTPVerification onVerified={setVerifiedPhone} />
                        </div>
                    ) : (
                        <form action={handleSubmit} className="space-y-8">
                            {state?.error && (
                                <div className="rounded-md bg-red-50 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">Terjadi Kesalahan</h3>
                                            <div className="mt-2 text-sm text-red-700">
                                                <p>{state.error}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-green-50 border border-green-200 rounded-md p-3">
                                <p className="text-sm text-green-800">
                                    ✓ Nomor terverifikasi: <strong>{verifiedPhone}</strong>
                                </p>
                            </div>

                            {/* Package Selection */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Pilih Paket Layanan</h3>
                                {loadingPackages ? (
                                    <div className="text-center py-4">
                                        <Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-600" />
                                        <p className="mt-2 text-sm text-gray-500">Memuat paket...</p>
                                    </div>
                                ) : (
                                    <PackageSelector
                                        packages={packages}
                                        selectedId={selectedPackage || undefined}
                                        onSelect={setSelectedPackage}
                                    />
                                )}
                                <input type="hidden" name="selectedPackageId" value={selectedPackage || ''} />
                            </div>

                            {/* Promo Code (Optional) */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Kode Promo (Opsional)</h3>
                                <div className="max-w-md">
                                    <label htmlFor="promoCode" className="block text-sm font-medium text-gray-700">
                                        Punya kode promo? Masukkan di sini
                                    </label>
                                    <div className="mt-1">
                                        <input
                                            type="text"
                                            name="promoCode"
                                            id="promoCode"
                                            placeholder="Contoh: PROMO123"
                                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border uppercase font-mono"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        Kode promo akan divalidasi saat pendaftaran
                                    </p>
                                </div>
                            </div>

                            {/* Personal Information */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Pribadi</h3>
                                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                                    <div className="sm:col-span-3">
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                            Nama Lengkap
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="text"
                                                name="name"
                                                id="name"
                                                required
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                            />
                                        </div>
                                    </div>

                                    <div className="sm:col-span-3">
                                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                                            Email (Opsional)
                                        </label>
                                        <div className="mt-1">
                                            <input
                                                type="email"
                                                name="email"
                                                id="email"
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Location Selection */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Lokasi</h3>
                                <LocationSelector
                                    onLocationChange={(data) => {
                                        // Data will be submitted via hidden inputs in LocationSelector
                                        console.log('Location selected:', data);
                                    }}
                                />
                            </div>

                            {/* Address */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Alamat Lengkap</h3>
                                <div className="grid grid-cols-1 gap-y-6">
                                    <div className="sm:col-span-6">
                                        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                                            Alamat Jalan / Detail Lokasi
                                        </label>
                                        <div className="mt-1">
                                            <textarea
                                                id="address"
                                                name="address"
                                                rows={3}
                                                required
                                                placeholder="Contoh: Jl. Raya No. 123, dekat Indomaret"
                                                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Location Map */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Lokasi Pemasangan</h3>
                                <p className="text-sm text-gray-500 mb-2">Geser pin ke lokasi tepat rumah Anda.</p>
                                <LocationMap
                                    onLocationSelect={(lat, lng) => {
                                        const latInput = document.getElementById('latitude') as HTMLInputElement;
                                        const lngInput = document.getElementById('longitude') as HTMLInputElement;
                                        if (latInput && lngInput) {
                                            latInput.value = lat.toString();
                                            lngInput.value = lng.toString();
                                        }
                                    }}
                                />
                                <input type="hidden" id="latitude" name="latitude" />
                                <input type="hidden" id="longitude" name="longitude" />
                            </div>

                            {/* KTP Upload */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Upload KTP</h3>
                                <KTPUpload
                                    onUploadComplete={(url) => {
                                        const input = document.getElementById('ktpImageUrl') as HTMLInputElement;
                                        if (input) input.value = url;
                                    }}
                                />
                                <input type="hidden" id="ktpImageUrl" name="ktpImageUrl" />
                            </div>

                            {/* Signature */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Tanda Tangan Digital</h3>
                                <p className="text-sm text-gray-500 mb-2">Silakan tanda tangan di kotak di bawah ini.</p>
                                <SignaturePad
                                    onEnd={(dataUrl) => {
                                        const input = document.getElementById('signatureData') as HTMLInputElement;
                                        if (input) input.value = dataUrl;
                                    }}
                                />
                                <input type="hidden" id="signatureData" name="signatureData" />
                            </div>

                            {/* Terms & Conditions */}
                            <div className="flex items-start">
                                <div className="flex items-center h-5">
                                    <input
                                        id="terms"
                                        name="terms"
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                                    />
                                </div>
                                <div className="ml-3 text-sm">
                                    <label htmlFor="terms" className="font-medium text-gray-700">
                                        Saya menyetujui{' '}
                                        <button
                                            type="button"
                                            onClick={() => setShowTermsModal(true)}
                                            className="text-indigo-600 hover:text-indigo-500 underline"
                                        >
                                            Syarat & Ketentuan Layanan
                                        </button>
                                    </label>
                                </div>
                            </div>

                            {/* Terms Modal */}
                            {showTermsModal && (
                                <div className="fixed inset-0 z-50 overflow-y-auto">
                                    <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                                        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowTermsModal(false)} />
                                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                                <div className="sm:flex sm:items-start">
                                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                                        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                                                            Syarat & Ketentuan Layanan
                                                        </h3>
                                                        <div className="mt-2 border p-4 rounded-md h-64 overflow-y-auto bg-gray-50 text-sm text-gray-600 whitespace-pre-wrap">
                                                            {termsContent || 'Memuat Syarat & Ketentuan...'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                                <button
                                                    type="button"
                                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                                                    onClick={() => {
                                                        setAgreedToTerms(true);
                                                        setShowTermsModal(false);
                                                    }}
                                                >
                                                    Setuju & Tutup
                                                </button>
                                                <button
                                                    type="button"
                                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                                    onClick={() => setShowTermsModal(false)}
                                                >
                                                    Tutup
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <SubmitButton />
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

function SubmitButton() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
            {pending ? (
                <>
                    <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
                    Memproses...
                </>
            ) : (
                'Daftar Sekarang'
            )}
        </button>
    );
}
