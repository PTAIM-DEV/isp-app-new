'use client';

import { useEffect, useState } from 'react';
import { Ticket, FileText, X, User, Phone, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface CustomerInfo {
    id: string;
    name: string;
    phone: string;
    status: string;
    email?: string;
    address?: string;
}

interface CustomerContextPanelProps {
    chatJid: string;
    chatName: string;
}

export default function CustomerContextPanel({ chatJid, chatName }: CustomerContextPanelProps) {
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        setIsSearching(true);
        try {
            const response = await fetch(`/api/whatsapp/customer-info?phone=${searchTerm}`);
            if (response.ok) {
                const data = await response.json();
                setCustomerInfo(data.customer);
            } else {
                alert('Customer tidak ditemukan');
            }
        } catch (error) {
            console.error('Error searching customer:', error);
        } finally {
            setIsSearching(false);
        }
    };

    useEffect(() => {
        const fetchCustomerInfo = async () => {
            try {
                // Extract phone number from JID (e.g., 628123456789@s.whatsapp.net -> 628123456789)
                const phoneNumber = chatJid.split('@')[0];

                const response = await fetch(`/api/whatsapp/customer-info?phone=${phoneNumber}`);
                if (response.ok) {
                    const data = await response.json();
                    setCustomerInfo(data.customer);
                } else {
                    setCustomerInfo(null);
                }
            } catch (error) {
                console.error('Error fetching customer info:', error);
                setCustomerInfo(null);
            } finally {
                setLoading(false);
            }
        };

        fetchCustomerInfo();
    }, [chatJid]);

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center">
                <div className="text-gray-500 text-sm">Memuat...</div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 shrink-0">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Informasi Kontak</h3>

                {/* Search / Override Input */}
                <form onSubmit={handleSearch} className="relative">
                    <input
                        type="text"
                        placeholder="Cari Customer (Nama/HP)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                </form>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {customerInfo ? (
                    <div className="space-y-4">
                        {/* Customer Name */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Nama
                            </label>
                            <div className="mt-1 flex items-center space-x-2">
                                <User className="w-4 h-4 text-gray-400" />
                                <p className="text-sm font-medium text-gray-900">{customerInfo.name}</p>
                            </div>
                        </div>

                        {/* Phone Number */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Nomor Telepon
                            </label>
                            <div className="mt-1 flex items-center space-x-2">
                                <Phone className="w-4 h-4 text-gray-400" />
                                <p className="text-sm text-gray-900">{customerInfo.phone}</p>
                            </div>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Status
                            </label>
                            <div className="mt-1 flex items-center space-x-2">
                                {customerInfo.status === 'ACTIVE' || customerInfo.status === 'CUSTOMER' ? (
                                    <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                    <XCircle className="w-4 h-4 text-gray-400" />
                                )}
                                <span className={`text-sm font-medium ${customerInfo.status === 'ACTIVE' || customerInfo.status === 'CUSTOMER'
                                        ? 'text-green-600'
                                        : 'text-gray-600'
                                    }`}>
                                    {customerInfo.status === 'ACTIVE' || customerInfo.status === 'CUSTOMER'
                                        ? 'Aktif'
                                        : customerInfo.status === 'LEAD'
                                            ? 'Lead'
                                            : customerInfo.status}
                                </span>
                            </div>
                        </div>

                        {/* Email (if available) */}
                        {customerInfo.email && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Email
                                </label>
                                <p className="mt-1 text-sm text-gray-900">{customerInfo.email}</p>
                            </div>
                        )}

                        {/* Address (if available) */}
                        {customerInfo.address && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    Alamat
                                </label>
                                <p className="mt-1 text-sm text-gray-900">{customerInfo.address}</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Fallback: Show chat info */}
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Nama
                            </label>
                            <p className="mt-1 text-sm font-medium text-gray-900">{chatName}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Nomor Telepon
                            </label>
                            <p className="mt-1 text-sm text-gray-900">{chatJid.split('@')[0]}</p>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                Status
                            </label>
                            <p className="mt-1 text-sm text-gray-500">Belum terdaftar sebagai customer</p>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="mt-6 space-y-2">
                    <Link
                        href={`/admin/customers?search=${chatJid.split('@')[0]}`}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                        <Ticket className="w-4 h-4" />
                        <span>Buat Tiket</span>
                    </Link>
                    <Link
                        href={`/admin/billing/invoices?search=${chatJid.split('@')[0]}`}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        <FileText className="w-4 h-4" />
                        <span>Cek Invoice</span>
                    </Link>
                    <button
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                    >
                        <X className="w-4 h-4" />
                        <span>Akhiri Chat</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

