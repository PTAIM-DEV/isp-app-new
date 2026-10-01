import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function PaymentFlowDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    let flow;
    try {
        flow = await prisma.paymentFlow.findUnique({
            where: { id },
        });
    } catch (error) {
        console.error('Error fetching payment flow:', error);
        // Show generic error UI
        return (
            <div className="p-8">
                <h2 className="text-2xl font-bold text-red-600">Terjadi kesalahan</h2>
                <p className="mt-4 text-gray-700">Tidak dapat memuat data payment flow.</p>
                <Link href="/admin/payment-flows" className="mt-6 inline-block text-indigo-600 hover:underline">
                    ← Kembali ke daftar
                </Link>
            </div>
        );
    }

    if (!flow) {
        // Flow tidak ditemukan – gunakan built‑in 404
        notFound();
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <Link href="/admin/payment-flows" className="text-indigo-600 hover:underline mb-4 inline-block">
                ← Kembali ke daftar
            </Link>
            <h1 className="text-3xl font-bold mb-4">{flow.name}</h1>
            <p className="text-gray-700 mb-6">{flow.description || 'Tidak ada deskripsi.'}</p>

            <div className="bg-white shadow rounded-lg p-6 space-y-4">
                <h2 className="text-xl font-semibold">Konfigurasi</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-800">
                    {flow.requiresInstallationPayment && (
                        <li>💰 Instalasi: Rp {Number(flow.installationFeeAmount || 0).toLocaleString('id-ID')}</li>
                    )}
                    {flow.freeInstallation && <li>✅ Gratis Instalasi</li>}
                    {flow.supportsTrial && (
                        <li>🎁 Trial: {flow.trialDays} hari</li>
                    )}
                </ul>
            </div>

            <div className="mt-6 flex items-center space-x-4 text-sm text-gray-500">
                <span>Status: {flow.isActive ? 'Aktif' : 'Nonaktif'}</span>
                <span>Dibuat: {formatDate(flow.createdAt)}</span>
            </div>
        </div>
    );
}
