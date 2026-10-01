import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Plus, MapPin, Wrench } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TechniciansPage() {
    const technicians = await prisma.user.findMany({
        where: { role: 'TECHNICIAN' },
        orderBy: { name: 'asc' },
        include: {
            _count: {
                select: {
                    installationsAssigned: true,
                    tasksAssigned: true,
                }
            }
        }
    });

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Data Teknisi</h2>
                <Link
                    href="/admin/technicians/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Tambah Teknisi
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kontak</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Area Kerja</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keahlian</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tugas</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {technicians.map((tech) => (
                            <tr key={tech.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        {tech.photoUrl && (
                                            <img
                                                src={tech.photoUrl}
                                                alt={tech.name}
                                                className="h-10 w-10 rounded-full mr-3 object-cover"
                                            />
                                        )}
                                        <div className="text-sm font-medium text-gray-900">{tech.name}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900">{tech.phone}</div>
                                    {tech.email && (
                                        <div className="text-xs text-gray-500">{tech.email}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tech.status === 'ACTIVE'
                                        ? 'bg-green-100 text-green-800'
                                        : tech.status === 'ON_LEAVE'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {tech.status === 'ACTIVE' ? 'Aktif' : tech.status === 'ON_LEAVE' ? 'Cuti' : 'Non-Aktif'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-900">
                                        {tech.assignedProvinces.length > 0 || tech.assignedCities.length > 0 ? (
                                            <div className="flex items-center text-xs">
                                                <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                                                <span>
                                                    {tech.assignedProvinces.length} Provinsi, {tech.assignedCities.length} Kota
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-xs">Tidak ditentukan</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-1">
                                        {tech.skills.length > 0 ? (
                                            tech.skills.map((skill) => (
                                                <span
                                                    key={skill}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800"
                                                >
                                                    <Wrench className="w-3 h-3 mr-1" />
                                                    {skill === 'INSTALLATION' ? 'Instalasi' :
                                                        skill === 'MAINTENANCE' ? 'Maintenance' :
                                                            skill === 'TROUBLESHOOTING' ? 'Troubleshooting' :
                                                                skill === 'UPGRADE' ? 'Upgrade' : skill}
                                                </span>
                                            ))
                                        ) : (
                                            <span className="text-xs text-gray-400">-</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <div className="space-y-1">
                                        <div>Instalasi: {tech._count.installationsAssigned}</div>
                                        <div>Maintenance: {tech._count.tasksAssigned}</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <Link
                                        href={`/admin/technicians/${tech.id}/edit`}
                                        className="text-indigo-600 hover:text-indigo-900"
                                    >
                                        Edit
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {technicians.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                                    Belum ada data teknisi.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
