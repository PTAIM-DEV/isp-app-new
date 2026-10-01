'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginTechnician, sendTechnicianOTP } from './actions';
import { Lock, Phone, Loader2, MessageSquare } from 'lucide-react';

export default function TechnicianLoginPage() {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
    const [step, setStep] = useState<'method' | 'password' | 'otp'>('method');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [otpSent, setOtpSent] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const router = useRouter();

    async function handleSendOTP() {
        if (!phone) {
            setError('Masukkan nomor telepon');
            return;
        }

        setIsLoading(true);
        setError('');

        const result = await sendTechnicianOTP(phone);
        setIsLoading(false);

        if (result.success) {
            setOtpSent(true);
            setError('');
            setCountdown(60);

            // Countdown timer
            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            setError(result.error || 'Gagal mengirim OTP');
        }
    }

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const result = await loginTechnician(
            phone,
            loginMethod === 'password' ? password : undefined,
            loginMethod === 'otp' ? otp : undefined
        );

        setIsLoading(false);

        if (result.success) {
            router.push('/technician/dashboard');
        } else {
            setError(result.error || 'Login gagal');
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-white mb-2">
                        Login Teknisi
                    </h2>
                    <p className="text-indigo-100">
                        Masuk ke akun teknisi Anda
                    </p>
                </div>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
                    <form onSubmit={handleLogin} className="space-y-6">
                        {error && (
                            <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
                                {error}
                            </div>
                        )}

                        {/* Phone Number */}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                                Nomor Telepon
                            </label>
                            <div className="mt-1 relative">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="phone"
                                    name="phone"
                                    type="tel"
                                    required
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder="628123456789"
                                    className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                />
                            </div>
                        </div>

                        {/* Login Method Selection */}
                        {step === 'method' && (
                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLoginMethod('password');
                                        setStep('password');
                                    }}
                                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <Lock className="w-5 h-5 mr-2" />
                                    Login dengan Password
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setLoginMethod('otp');
                                        setStep('otp');
                                    }}
                                    className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <MessageSquare className="w-5 h-5 mr-2" />
                                    Login dengan OTP WhatsApp
                                </button>
                            </div>
                        )}

                        {/* Password Login */}
                        {step === 'password' && (
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                                    Password
                                </label>
                                <div className="mt-1 relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setStep('method')}
                                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-800"
                                >
                                    ← Pilih metode lain
                                </button>
                            </div>
                        )}

                        {/* OTP Login */}
                        {step === 'otp' && (
                            <div className="space-y-4">
                                {!otpSent ? (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleSendOTP}
                                            disabled={isLoading || !phone}
                                            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                                    Mengirim...
                                                </>
                                            ) : (
                                                <>
                                                    <MessageSquare className="w-5 h-5 mr-2" />
                                                    Kirim OTP via WhatsApp
                                                </>
                                            )}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setStep('method')}
                                            className="w-full text-sm text-indigo-600 hover:text-indigo-800"
                                        >
                                            ← Pilih metode lain
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div>
                                            <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
                                                Kode OTP
                                            </label>
                                            <div className="mt-1">
                                                <input
                                                    id="otp"
                                                    name="otp"
                                                    type="text"
                                                    required
                                                    maxLength={6}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                                    placeholder="123456"
                                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 text-center text-2xl tracking-widest"
                                                />
                                            </div>
                                            <p className="mt-2 text-xs text-gray-500">
                                                Kode OTP telah dikirim ke WhatsApp Anda
                                            </p>
                                            {countdown > 0 && (
                                                <p className="mt-1 text-xs text-gray-400">
                                                    Kirim ulang dalam {countdown} detik
                                                </p>
                                            )}
                                        </div>
                                        {countdown === 0 && (
                                            <button
                                                type="button"
                                                onClick={handleSendOTP}
                                                className="w-full text-sm text-indigo-600 hover:text-indigo-800"
                                            >
                                                Kirim ulang OTP
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {/* Submit Button */}
                        {(step === 'password' || (step === 'otp' && otpSent)) && (
                            <div>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                            Masuk...
                                        </>
                                    ) : (
                                        'Masuk'
                                    )}
                                </button>
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
}

