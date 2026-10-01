'use client';

import { useState } from 'react';
import { scheduleInstallation } from './actions';

interface Technician {
    id: string;
    name: string;
}

export function ScheduleForm({
    userId,
    existingInstallation,
    technicians
}: {
    userId: string;
    existingInstallation: any;
    technicians: Technician[];
}) {
    const [date, setDate] = useState(existingInstallation?.scheduledDate ? new Date(existingInstallation.scheduledDate).toISOString().slice(0, 16) : '');
    const [technicianId, setTechnicianId] = useState(existingInstallation?.technicianUserId || '');
    const [message, setMessage] = useState('');

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage('');

        const result = await scheduleInstallation(userId, date, technicianId);

        if (result.success) {
            setMessage('Jadwal berhasil disimpan!');
        } else {
            setMessage('Gagal menyimpan jadwal: ' + result.error);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {message && (
                <div className={`p-4 rounded-md ${message.includes('Gagal') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message}
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700">Tanggal & Jam Instalasi</label>
                <input
                    type="datetime-local"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700">Teknisi</label>
                <select
                    required
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                >
                    <option value="">Pilih Teknisi</option>
                    {technicians.map((tech) => (
                        <option key={tech.id} value={tech.id}>
                            {tech.name}
                        </option>
                    ))}
                </select>
            </div>

            <button
                type="submit"
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Simpan Jadwal
            </button>
        </form>
    );
}
