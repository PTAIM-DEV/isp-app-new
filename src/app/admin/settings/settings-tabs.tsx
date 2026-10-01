'use client';

import { useState } from 'react';
import {
    Settings, MessageSquare, CreditCard, Shield, FileText, Database,
    Terminal, LayoutGrid, Bell, UserCheck, Bot
} from 'lucide-react';
import { SettingsForm } from './settings-form';
import { TermsForm } from './terms-form';
import { XenditSettingsForm } from './xendit-form';
import { AdminCredentialsForm } from './admin-credentials-form';
import AIConfigForm from './ai-config-form';
import { ReminderTemplatesForm } from './reminder-templates-form';
import { WelcomeTemplateForm } from './welcome-template-form';
import { SalesTemplateForm } from './sales-template-form';
import { PaymentTemplatesForm } from './payment-templates-form';
import WhatsAppSettingsClient from './whatsapp-settings-form';

interface SettingsTabsProps {
    settingsMap: Record<string, string>;
    whatsappTemplates?: any[];
}

export function SettingsTabs({ settingsMap, whatsappTemplates = [] }: SettingsTabsProps) {
    const [activeTab, setActiveTab] = useState('general');

    const minInterval = parseInt(settingsMap['whatsapp_min_interval'] || '5000');
    const randomInterval = parseInt(settingsMap['whatsapp_random_interval_max'] || '5000');

    const menuGroups = [
        {
            title: 'Sistem',
            items: [
                { id: 'general', label: 'Umum (Mikrotik)', icon: Settings },
                { id: 'admin', label: 'Admin Credentials', icon: Shield },
                { id: 'terms', label: 'Syarat & Ketentuan', icon: FileText },
            ]
        },
        {
            title: 'Komunikasi & Notifikasi',
            items: [
                { id: 'whatsapp', label: 'WhatsApp Anti-Ban', icon: MessageSquare },
                { id: 'reminder', label: 'Template Reminder', icon: Bell },
                { id: 'welcome', label: 'Template Welcome', icon: UserCheck },
                { id: 'sales', label: 'Template Sales', icon: LayoutGrid },
                { id: 'payment_templates', label: 'Template Payment', icon: CreditCard },
            ]
        },
        {
            title: 'Otomatisasi & AI',
            items: [
                { id: 'ai', label: 'AI Configuration', icon: Bot },
                { id: 'payment', label: 'Payment Gateway', icon: Database },
            ]
        }
    ];

    return (
        <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar Navigation */}
            <div className="w-full lg:w-64 flex-shrink-0">
                <div className="bg-white shadow rounded-lg sticky top-6 overflow-hidden">
                    <nav className="p-4 space-y-8">
                        {menuGroups.map((group, groupIndex) => (
                            <div key={groupIndex}>
                                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-3">
                                    {group.title}
                                </h3>
                                <div className="space-y-1">
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveTab(item.id)}
                                                className={`
                                                    w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                                                    ${activeTab === item.id
                                                        ? 'bg-indigo-50 text-indigo-700'
                                                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}
                                                `}
                                            >
                                                <Icon className={`mr-3 h-5 w-5 ${activeTab === item.id ? 'text-indigo-500' : 'text-gray-400'}`} />
                                                {item.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 min-w-0">
                {activeTab === 'general' && (
                    <div className="bg-white shadow sm:rounded-lg p-6 max-w-2xl">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Koneksi Mikrotik & Sistem Utama</h3>
                        <p className="text-sm text-gray-500 mb-6">Konfigurasi dasar koneksi ke Router Mikrotik dan identitas aplikasi.</p>
                        <SettingsForm initialSettings={settingsMap} />
                    </div>
                )}

                {activeTab === 'admin' && (
                    <div className="bg-white shadow sm:rounded-lg p-6 max-w-2xl">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Credentials</h3>
                        <p className="text-sm text-gray-500 mb-6">Ubah username dan password untuk akses panel admin.</p>
                        <AdminCredentialsForm
                            initialUsername={settingsMap['admin_username']}
                            initialPassword={settingsMap['admin_password']}
                        />
                    </div>
                )}

                {activeTab === 'terms' && (
                    <div className="bg-white shadow sm:rounded-lg p-6 max-w-4xl">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Syarat & Ketentuan Layanan</h3>
                        <p className="text-sm text-gray-500 mb-6">Konten ini akan ditampilkan pada halaman registrasi pelanggan.</p>
                        <TermsForm initialContent={settingsMap['terms_and_conditions'] || ''} />
                    </div>
                )}

                {activeTab === 'whatsapp' && (
                    <div className="max-w-4xl">
                        <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">WhatsApp Anti-Ban Settings</h3>
                            <p className="text-sm text-gray-500">
                                Konfigurasi tingkat lanjut untuk mencegah pemblokiran WhatsApp.
                                Atur interval 'typing' dan jeda antar pesan untuk meniru perilaku manusia.
                            </p>
                        </div>
                        <WhatsAppSettingsClient
                            minInterval={minInterval}
                            randomInterval={randomInterval}
                            templates={whatsappTemplates}
                        />
                    </div>
                )}

                {activeTab === 'reminder' && (
                    <div className="max-w-5xl">
                        <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Template Reminder Tagihan</h3>
                            <p className="text-sm text-gray-500">
                                Kelola template pesan WhatsApp dan Email untuk pengingat pembayaran otomatis.
                                Gunakan fitur <strong>Safe Flow</strong> untuk mengurangi risiko blokir WhatsApp.
                            </p>
                        </div>
                        <ReminderTemplatesForm settingsMap={settingsMap} />
                    </div>
                )}

                {activeTab === 'welcome' && (
                    <div className="max-w-5xl">
                        <div className="bg-white shadow sm:rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Template Welcome Message</h3>
                            <WelcomeTemplateForm settingsMap={settingsMap} />
                        </div>
                    </div>
                )}

                {activeTab === 'sales' && (
                    <div className="max-w-5xl">
                        <div className="bg-white shadow sm:rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Template Sales / Promosi</h3>
                            <SalesTemplateForm settingsMap={settingsMap} />
                        </div>
                    </div>
                )}

                {activeTab === 'payment_templates' && (
                    <div className="max-w-5xl">
                        <div className="bg-white shadow sm:rounded-lg p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Template Informasi Pembayaran</h3>
                            <PaymentTemplatesForm settingsMap={settingsMap} />
                        </div>
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="max-w-4xl">
                        <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Konfigurasi Kecerdasan Buatan (AI)</h3>
                            <p className="text-sm text-gray-500">
                                Masukkan API Key OpenAI Anda untuk mengaktifkan fitur generate template otomatis.
                            </p>
                        </div>
                        <AIConfigForm />
                    </div>
                )}

                {activeTab === 'payment' && (
                    <div className="bg-white shadow sm:rounded-lg p-6 max-w-2xl">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Gateway (Xendit)</h3>
                        <p className="text-sm text-gray-500 mb-6">Konfigurasi biaya admin dan integrasi Xendit.</p>
                        <XenditSettingsForm initialSettings={settingsMap} />
                    </div>
                )}
            </div>
        </div>
    );
}
