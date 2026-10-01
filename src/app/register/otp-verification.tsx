'use client';

import { useState } from 'react';
import { sendOTP, verifyOTP } from './otp-actions';

interface OTPVerificationProps {
    onVerified: (phone: string) => void;
}

export function OTPVerification({ onVerified }: OTPVerificationProps) {
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [countdown, setCountdown] = useState(0);

    async function handleSendOTP() {
        if (!phone) {
            setMessage('Masukkan nomor WhatsApp');
            return;
        }

        setLoading(true);
        setMessage('');

        const result = await sendOTP(phone);
        setLoading(false);

        if (result.success) {
            setStep('otp');
            setMessage('Kode OTP telah dikirim ke WhatsApp Anda');
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
            setMessage(result.error || 'Gagal mengirim OTP');
        }
    }

    async function handleVerifyOTP() {
        if (!otp || otp.length !== 6) {
            setMessage('Masukkan kode OTP 6 digit');
            return;
        }

        setLoading(true);
        setMessage('');

        const result = await verifyOTP(phone, otp);
        setLoading(false);

        if (result.success) {
            setMessage('Verifikasi berhasil!');
            onVerified(phone);
        } else {
            setMessage(result.error || 'Verifikasi gagal');
        }
    }

    return (
        <div className="space-y-4">
            {message && (
                <div className={`p-3 rounded-md text-sm ${message.includes('berhasil') || message.includes('dikirim')
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-700'
                    }`}>
                    {message}
                </div>
            )}

            {step === 'phone' ? (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nomor WhatsApp
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="628123456789"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Format: 628xxxxxxxxx (gunakan kode negara 62)
                        </p>
                    </div>
                    <button
                        onClick={handleSendOTP}
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Mengirim...' : 'Kirim Kode OTP'}
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-3">
                        <p className="text-xs text-blue-800">
                            💡 <strong>Development Mode:</strong> Gunakan kode <code className="bg-blue-100 px-1 rounded">123456</code> untuk bypass OTP
                        </p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kode OTP
                        </label>
                        <input
                            type="text"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            maxLength={6}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center text-2xl tracking-widest"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Masukkan 6 digit kode yang dikirim ke WhatsApp Anda
                        </p>
                    </div>
                    <button
                        onClick={handleVerifyOTP}
                        disabled={loading || otp.length !== 6}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Memverifikasi...' : 'Verifikasi OTP'}
                    </button>
                    <div className="flex items-center justify-between text-sm">
                        <button
                            onClick={() => {
                                setStep('phone');
                                setOtp('');
                                setMessage('');
                            }}
                            className="text-gray-600 hover:text-gray-800"
                        >
                            ← Ubah Nomor
                        </button>
                        {countdown > 0 ? (
                            <span className="text-gray-500">
                                Kirim ulang dalam {countdown}s
                            </span>
                        ) : (
                            <button
                                onClick={handleSendOTP}
                                disabled={loading}
                                className="text-indigo-600 hover:text-indigo-800"
                            >
                                Kirim Ulang OTP
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
