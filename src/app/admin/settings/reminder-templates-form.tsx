'use client';

import { useState, useEffect } from 'react';
import { Save, Mail, MessageSquare, Sparkles, Loader2 } from 'lucide-react';
import { updateReminderTemplates } from './actions';
import { generateReminderTemplateAction } from './ai-actions';

interface ReminderTemplatesFormProps {
    settingsMap: Record<string, string>;
}

export function ReminderTemplatesForm({ settingsMap }: ReminderTemplatesFormProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // States for H-5, H-2, H-0, D+1, D+2, D+5
    const [h5Whatsapp, setH5Whatsapp] = useState('');
    const [h5EmailSubject, setH5EmailSubject] = useState('');
    const [h5EmailBody, setH5EmailBody] = useState('');

    const [h2Whatsapp, setH2Whatsapp] = useState('');
    const [h2EmailSubject, setH2EmailSubject] = useState('');
    const [h2EmailBody, setH2EmailBody] = useState('');

    const [h0Whatsapp, setH0Whatsapp] = useState('');
    const [h0EmailSubject, setH0EmailSubject] = useState('');
    const [h0EmailBody, setH0EmailBody] = useState('');

    const [d1Whatsapp, setD1Whatsapp] = useState('');
    const [d1EmailSubject, setD1EmailSubject] = useState('');
    const [d1EmailBody, setD1EmailBody] = useState('');

    const [d2Whatsapp, setD2Whatsapp] = useState('');
    const [d2EmailSubject, setD2EmailSubject] = useState('');
    const [d2EmailBody, setD2EmailBody] = useState('');

    const [d5Whatsapp, setD5Whatsapp] = useState('');
    const [d5EmailSubject, setD5EmailSubject] = useState('');
    const [d5EmailBody, setD5EmailBody] = useState('');

    // Safe Flow States
    const [safeFlowGreetings, setSafeFlowGreetings] = useState('');
    const [safeFlowApologies, setSafeFlowApologies] = useState('');
    const [safeFlowIntros, setSafeFlowIntros] = useState('');
    const [safeFlowBody, setSafeFlowBody] = useState('');

    // Load templates from settings
    useEffect(() => {
        // H-5
        setH5Whatsapp(settingsMap['reminder_whatsapp_H-5'] || '');
        setH5EmailSubject(settingsMap['reminder_email_subject_H-5'] || '');
        setH5EmailBody(settingsMap['reminder_email_body_H-5'] || '');

        // H-2
        setH2Whatsapp(settingsMap['reminder_whatsapp_H-2'] || '');
        setH2EmailSubject(settingsMap['reminder_email_subject_H-2'] || '');
        setH2EmailBody(settingsMap['reminder_email_body_H-2'] || '');

        // H-0
        setH0Whatsapp(settingsMap['reminder_whatsapp_H-0'] || '');
        setH0EmailSubject(settingsMap['reminder_email_subject_H-0'] || '');
        setH0EmailBody(settingsMap['reminder_email_body_H-0'] || '');

        // D+1
        setD1Whatsapp(settingsMap['reminder_whatsapp_D_plus_1'] || '');
        setD1EmailSubject(settingsMap['reminder_email_subject_D_plus_1'] || '');
        setD1EmailBody(settingsMap['reminder_email_body_D_plus_1'] || '');

        // D+2
        setD2Whatsapp(settingsMap['reminder_whatsapp_D_plus_2'] || '');
        setD2EmailSubject(settingsMap['reminder_email_subject_D_plus_2'] || '');
        setD2EmailBody(settingsMap['reminder_email_body_D_plus_2'] || '');

        // D+5
        setD5Whatsapp(settingsMap['reminder_whatsapp_D_plus_5'] || '');
        setD5EmailSubject(settingsMap['reminder_email_subject_D_plus_5'] || '');
        setD5EmailBody(settingsMap['reminder_email_body_D_plus_5'] || '');

        // Safe Flow
        setSafeFlowGreetings(settingsMap['safe_flow_greetings'] || '');
        setSafeFlowApologies(settingsMap['safe_flow_apologies'] || '');
        setSafeFlowIntros(settingsMap['safe_flow_intros'] || '');
        setSafeFlowBody(settingsMap['safe_flow_body_template'] || '');
    }, [settingsMap]);

    const [generating, setGenerating] = useState<string | null>(null);

    async function handleGenerate(
        key: string,
        interval: string,
        type: 'whatsapp' | 'email_subject' | 'email_body' | 'safe_greeting' | 'safe_apology' | 'safe_intro',
        setter: (val: string) => void
    ) {
        setGenerating(key);
        try {
            const result = await generateReminderTemplateAction(interval, type);
            if (result.success && result.content) {
                setter(result.content);
            } else {
                alert(result.error || 'Gagal generate template');
            }
        } catch (error) {
            console.error('Generate error:', error);
            alert('Terjadi kesalahan saat generate template');
        } finally {
            setGenerating(null);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await updateReminderTemplates({
                h5Whatsapp, h5EmailSubject, h5EmailBody,
                h2Whatsapp, h2EmailSubject, h2EmailBody,
                h0Whatsapp, h0EmailSubject, h0EmailBody,
                d1Whatsapp, d1EmailSubject, d1EmailBody,
                d2Whatsapp, d2EmailSubject, d2EmailBody,
                d5Whatsapp, d5EmailSubject, d5EmailBody,
                safeFlowGreetings, safeFlowApologies, safeFlowIntros, safeFlowBody
            });

            if (result.success) {
                setSuccess(true);
                setTimeout(() => setSuccess(false), 3000);
            } else {
                setError(result.error || 'Gagal menyimpan template');
            }
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan');
        } finally {
            setIsLoading(false);
        }
    }

    const renderSafeFlowSection = () => (
        <div className="bg-white p-6 rounded-lg shadow border-l-4 border-teal-500">
            <h3 className="text-lg font-semibold mb-4 text-teal-700">Konfigurasi Safe Flow (Anti-Ban 3 Steps)</h3>
            <p className="text-sm text-gray-600 mb-4">
                Sistem akan memilih secara acak satu baris dari setiap list di bawah ini untuk dikirim secara bertahap.
                <br />
                Gunakan <code>{`{{time}}`}</code> untuk waktu dinamis (Pagi/Siang/Sore/Malam).
            </p>

            <div className="space-y-6">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">
                            Step 1: Salam Pembuka (Greetings)
                        </label>
                        <button
                            type="button"
                            onClick={() => handleGenerate('safe_greeting', 'safe', 'safe_greeting', setSafeFlowGreetings)}
                            disabled={generating === 'safe_greeting'}
                            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                            {generating === 'safe_greeting' ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <Sparkles className="w-3 h-3 mr-1" />
                            )}
                            Generate Variations
                        </button>
                    </div>
                    <textarea
                        value={safeFlowGreetings}
                        onChange={(e) => setSafeFlowGreetings(e.target.value)}
                        rows={5}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 font-mono text-xs"
                        placeholder={`Selamat {{time}} kak\nHalo kak, selamat {{time}}\nPermisi kak`}
                    />
                    <p className="text-xs text-gray-400 mt-1">Satu variasi per baris.</p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">
                            Step 2: Permintaan Maaf (Apologies)
                        </label>
                        <button
                            type="button"
                            onClick={() => handleGenerate('safe_apology', 'safe', 'safe_apology', setSafeFlowApologies)}
                            disabled={generating === 'safe_apology'}
                            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                            {generating === 'safe_apology' ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <Sparkles className="w-3 h-3 mr-1" />
                            )}
                            Generate Variations
                        </button>
                    </div>
                    <textarea
                        value={safeFlowApologies}
                        onChange={(e) => setSafeFlowApologies(e.target.value)}
                        rows={5}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 font-mono text-xs"
                        placeholder={`Maaf mengganggu waktunya sebentar\nMohon maaf ganggu kak\nPunten kak`}
                    />
                    <p className="text-xs text-gray-400 mt-1">Satu variasi per baris.</p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">
                            Step 3: Intro ke Topik (Bridge)
                        </label>
                        <button
                            type="button"
                            onClick={() => handleGenerate('safe_intro', 'safe', 'safe_intro', setSafeFlowIntros)}
                            disabled={generating === 'safe_intro'}
                            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                            {generating === 'safe_intro' ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <Sparkles className="w-3 h-3 mr-1" />
                            )}
                            Generate Variations
                        </button>
                    </div>
                    <textarea
                        value={safeFlowIntros}
                        onChange={(e) => setSafeFlowIntros(e.target.value)}
                        rows={5}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 font-mono text-xs"
                        placeholder={`saya mau reminder ada tagihan internet\nmau infokan tagihan kak\nizin mengingatkan tagihan`}
                    />
                    <p className="text-xs text-gray-400 mt-1">Satu variasi per baris.</p>
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-gray-700">
                            Step 3 (Lanjutan): Body Pesan Utama
                        </label>
                    </div>
                    <textarea
                        value={safeFlowBody}
                        onChange={(e) => setSafeFlowBody(e.target.value)}
                        rows={8}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 sm:text-sm border p-2 font-mono text-xs"
                        placeholder={`{{intro}} {{invoiceNumber}} sebesar {{amount}} belum terbayar. Batas waktu {{dueDate}}.

Mohon segera dilakukan pembayaran ya kak:
{{paymentLink}}

Terima kasih.`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                        Variabel: <code>{`{{intro}}`}</code> (diambil dari list intro di atas), <code>{`{{invoiceNumber}}`}</code>, <code>{`{{amount}}`}</code>, <code>{`{{dueDate}}`}</code>, <code>{`{{paymentLink}}`}</code>.
                    </p>
                </div>
            </div>
        </div>
    );

    const renderSection = (title: string, colorClass: string, states: any, setters: any, interval: string) => (
        <div className="bg-white p-6 rounded-lg shadow">
            <h3 className={`text-lg font-semibold mb-4 ${colorClass}`}>{title}</h3>

            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            WhatsApp Template
                        </label>
                        <button
                            type="button"
                            onClick={() => handleGenerate(`${interval}_whatsapp`, interval, 'whatsapp', setters.setWhatsapp)}
                            disabled={generating === `${interval}_whatsapp`}
                            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                            {generating === `${interval}_whatsapp` ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <Sparkles className="w-3 h-3 mr-1" />
                            )}
                            Generate with AI
                        </button>
                    </div>
                    <textarea
                        value={states.whatsapp}
                        onChange={(e) => setters.setWhatsapp(e.target.value)}
                        rows={6}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-mono text-sm"
                        placeholder="Template pesan WhatsApp..."
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <Mail className="w-4 h-4 mr-2" />
                            Email Subject
                        </label>
                        <button
                            type="button"
                            onClick={() => handleGenerate(`${interval}_subject`, interval, 'email_subject', setters.setEmailSubject)}
                            disabled={generating === `${interval}_subject`}
                            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                            {generating === `${interval}_subject` ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <Sparkles className="w-3 h-3 mr-1" />
                            )}
                            Generate with AI
                        </button>
                    </div>
                    <input
                        type="text"
                        value={states.emailSubject}
                        onChange={(e) => setters.setEmailSubject(e.target.value)}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                        placeholder="Subject email..."
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-2">
                        <label className="flex items-center text-sm font-medium text-gray-700">
                            <Mail className="w-4 h-4 mr-2" />
                            Email Body (HTML)
                        </label>
                        <button
                            type="button"
                            onClick={() => handleGenerate(`${interval}_body`, interval, 'email_body', setters.setEmailBody)}
                            disabled={generating === `${interval}_body`}
                            className="inline-flex items-center text-xs text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                            {generating === `${interval}_body` ? (
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            ) : (
                                <Sparkles className="w-3 h-3 mr-1" />
                            )}
                            Generate with AI
                        </button>
                    </div>
                    <textarea
                        value={states.emailBody}
                        onChange={(e) => setters.setEmailBody(e.target.value)}
                        rows={10}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 font-mono text-sm"
                        placeholder="Template body email (HTML)..."
                    />
                </div>
            </div>
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            {success && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                    Template berhasil disimpan!
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                    {error}
                </div>
            )}

            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded text-sm">
                <p className="font-semibold mb-2">Variabel yang dapat digunakan:</p>
                <ul className="list-disc list-inside space-y-1">
                    <li><code>{`{{customerName}}`}</code> - Nama pelanggan</li>
                    <li><code>{`{{invoiceNumber}}`}</code> - Nomor invoice</li>
                    <li><code>{`{{amount}}`}</code> - Jumlah pembayaran</li>
                    <li><code>{`{{dueDate}}`}</code> - Tanggal jatuh tempo</li>
                    <li><code>{`{{paymentLink}}`}</code> - Link pembayaran</li>
                    <li><code>{`{{daysUntilDue}}`}</code> - Hari tersisa sampai jatuh tempo</li>
                </ul>
            </div>

            {renderSafeFlowSection()}

            {renderSection('D-5 (5 Hari Sebelum Jatuh Tempo)', 'text-blue-600',
                { whatsapp: h5Whatsapp, emailSubject: h5EmailSubject, emailBody: h5EmailBody },
                { setWhatsapp: setH5Whatsapp, setEmailSubject: setH5EmailSubject, setEmailBody: setH5EmailBody },
                'H-5'
            )}

            {renderSection('D-2 (2 Hari Sebelum Jatuh Tempo)', 'text-blue-600',
                { whatsapp: h2Whatsapp, emailSubject: h2EmailSubject, emailBody: h2EmailBody },
                { setWhatsapp: setH2Whatsapp, setEmailSubject: setH2EmailSubject, setEmailBody: setH2EmailBody },
                'H-2'
            )}

            {renderSection('H-0 (Hari Jatuh Tempo)', 'text-red-600',
                { whatsapp: h0Whatsapp, emailSubject: h0EmailSubject, emailBody: h0EmailBody },
                { setWhatsapp: setH0Whatsapp, setEmailSubject: setH0EmailSubject, setEmailBody: setH0EmailBody },
                'H-0'
            )}

            {renderSection('D+1 (1 Hari Terlambat)', 'text-orange-600',
                { whatsapp: d1Whatsapp, emailSubject: d1EmailSubject, emailBody: d1EmailBody },
                { setWhatsapp: setD1Whatsapp, setEmailSubject: setD1EmailSubject, setEmailBody: setD1EmailBody },
                'D+1'
            )}

            {renderSection('D+2 (2 Hari Terlambat)', 'text-orange-600',
                { whatsapp: d2Whatsapp, emailSubject: d2EmailSubject, emailBody: d2EmailBody },
                { setWhatsapp: setD2Whatsapp, setEmailSubject: setD2EmailSubject, setEmailBody: setD2EmailBody },
                'D+2'
            )}

            {renderSection('D+5 (5 Hari Terlambat - Soft Block)', 'text-red-800',
                { whatsapp: d5Whatsapp, emailSubject: d5EmailSubject, emailBody: d5EmailBody },
                { setWhatsapp: setD5Whatsapp, setEmailSubject: setD5EmailSubject, setEmailBody: setD5EmailBody },
                'D+5'
            )}

            <div className="flex justify-end sticky bottom-6 z-10">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 shadow-lg"
                >
                    <Save className="-ml-1 mr-2 h-5 w-5" />
                    {isLoading ? 'Menyimpan...' : 'Simpan Semua Template'}
                </button>
            </div>
        </form>
    );
}
