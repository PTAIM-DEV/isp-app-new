import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { notFound } from 'next/navigation';
import { ScheduleForm } from './schedule-form';
import { ActivateForm } from './activate-form';
import { PaymentFlowSelector } from './payment-flow-selector';
import { CompleteInstallationButton } from './complete-installation-button';
import { PaymentGateCard } from './payment-gate-card';
import { GenerateInvoiceButton } from './generate-invoice-button';
import { ResetPaymentFlowButton } from './reset-payment-flow-button';
import { checkPaymentGateStatus } from '@/lib/payment-gate';
import { PaymentHistory } from './payment-history';

interface PageProps {
    params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function LeadDetailsPage({ params }: PageProps) {
    const { id } = await params;
    console.log(`[LeadDetail] Fetching lead: ${id}`);

    const lead = await prisma.user.findUnique({
        where: { id },
        include: {
            installation: {
                include: {
                    technicianUser: true
                }
            },
            assignedPaymentFlow: true,
        },
    });

    const technicians = await prisma.user.findMany({
        where: {
            role: 'TECHNICIAN' as const,
            status: 'ACTIVE'
        },
        orderBy: { name: 'asc' }
    });

    const selectedPackage = lead?.selectedPackageId
        ? await prisma.servicePackage.findUnique({ where: { id: lead.selectedPackageId } })
        : null;

    if (!lead) {
        notFound();
    }

    // Check payment gate status
    const installationGate = await checkPaymentGateStatus(lead.id, 'INSTALLATION');
    const firstMonthGate = await checkPaymentGateStatus(lead.id, 'FIRST_MONTH');

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Detail Calon Pelanggan</h2>

            {/* Customer Information */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
                <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Informasi Pelanggan</h3>
                </div>
                <div className="border-t border-gray-200">
                    <dl>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Nama Lengkap</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{lead.name}</dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Nomor Telepon</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{lead.phone}</dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{lead.email || '-'}</dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Alamat</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{lead.address}</dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Koordinat</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {lead.latitude && lead.longitude ? (
                                    <a
                                        href={`https://www.google.com/maps?q=${lead.latitude},${lead.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:underline"
                                    >
                                        {lead.latitude}, {lead.longitude}
                                    </a>
                                ) : (
                                    'Tidak ada data lokasi'
                                )}
                            </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Paket Dipilih</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {selectedPackage ? (
                                    <div className="flex flex-col">
                                        <span className="font-medium">{selectedPackage.name} - {selectedPackage.speed}</span>
                                        <span className="text-gray-500 text-xs">
                                            Rp {selectedPackage.price.toLocaleString('id-ID')} / bulan
                                            {selectedPackage.priceIncludesPPN ? ' (Termasuk PPN)' : ' (Belum PPN)'}
                                        </span>
                                    </div>
                                ) : '-'}
                            </dd>
                        </div>
                        <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Kode Promo</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                {lead.registeredPromoCode ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {lead.registeredPromoCode}
                                    </span>
                                ) : (
                                    '-'
                                )}
                            </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Payment Flow</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 flex items-center">
                                {lead.assignedPaymentFlow ? (
                                    <>
                                        <span>{lead.assignedPaymentFlow.name}</span>
                                        {!installationGate.hasInvoice && !firstMonthGate.hasInvoice && (
                                            <ResetPaymentFlowButton userId={lead.id} />
                                        )}
                                    </>
                                ) : '-'}
                            </dd>
                        </div>
                        <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${lead.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                    lead.status === 'INSTALLED' || lead.status === 'INSTALLED_PAYMENT_PENDING' ? 'bg-blue-100 text-blue-800' :
                                        lead.status === 'PENDING_INSTALL' ? 'bg-yellow-100 text-yellow-800' :
                                            lead.status === 'LEAD_PAYMENT_PENDING' ? 'bg-orange-100 text-orange-800' :
                                                lead.status === 'READY_TO_INSTALL' ? 'bg-emerald-100 text-emerald-800' :
                                                    'bg-gray-100 text-gray-800'
                                    }`}>
                                    {lead.status}
                                </span>
                            </dd>
                        </div>
                        {lead.installation?.scheduledDate && (
                            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                                <dt className="text-sm font-medium text-gray-500">Tanggal Instalasi</dt>
                                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                                    {formatDate(lead.installation.scheduledDate)}
                                    {lead.installation.technicianUser && (
                                        <span className="ml-2 text-gray-500">
                                            (Teknisi: {lead.installation.technicianUser.name})
                                        </span>
                                    )}
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>
            </div>

            {/* WORKFLOW CONDITIONAL RENDERING WITH PAYMENT GATES */}

            {/* Step 1: Payment Flow Selection (Show if no payment flow assigned) */}
            {!lead.assignedPaymentFlowId && (
                <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Step 1: Pilih Payment Flow</h3>
                    <p className="text-sm text-gray-600 mb-4">
                        Pilih payment flow terlebih dahulu sebelum melanjutkan ke tahap berikutnya.
                    </p>
                    <PaymentFlowSelector userId={lead.id} currentFlowId={lead.assignedPaymentFlowId} />
                </div>
            )}

            {/* Step 2: After Payment Flow Selected - Check if installation payment required */}
            {(lead.status === 'LEAD' || lead.status === 'LEAD_PAYMENT_PENDING' || lead.status === 'READY_TO_INSTALL') && lead.assignedPaymentFlowId && lead.assignedPaymentFlow && (
                <>
                    {/* Scenario A: Installation payment required */}
                    {lead.assignedPaymentFlow.requiresInstallationPayment && !lead.assignedPaymentFlow.freeInstallation ? (
                        <>
                            {/* Step 2a: Generate Installation Invoice */}
                            {!installationGate.hasInvoice && (
                                <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Step 2: Generate Invoice Instalasi</h3>
                                    <GenerateInvoiceButton userId={lead.id} type="installation" />
                                </div>
                            )}

                            {/* Step 2b: Payment Gate - Waiting for Installation Payment */}
                            {installationGate.hasInvoice && !installationGate.isPaid && (
                                <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Step 2: Menunggu Pembayaran Instalasi</h3>
                                    <PaymentGateCard
                                        invoice={installationGate.invoice}
                                        customerName={lead.name}
                                        customerPhone={lead.phone}
                                    />
                                </div>
                            )}

                            {/* Step 3: Schedule Installation (unlocked after payment) */}
                            {installationGate.isPaid && (
                                <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Step 3: Jadwal Instalasi</h3>
                                    <div className="mb-4 bg-green-50 p-3 rounded-md">
                                        <p className="text-sm text-green-800">
                                            ✅ Pembayaran instalasi sudah diterima. Silakan jadwalkan instalasi.
                                        </p>
                                    </div>
                                    <ScheduleForm userId={lead.id} existingInstallation={lead.installation} technicians={technicians} />
                                </div>
                            )}
                        </>
                    ) : (
                        /* Scenario B: No installation payment required - Direct schedule */
                        <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Step 2: Jadwal Instalasi</h3>
                            <div className="mb-4 bg-blue-50 p-3 rounded-md">
                                <p className="text-sm text-blue-800">
                                    Payment Flow: <strong>{lead.assignedPaymentFlow.name}</strong>
                                    {lead.assignedPaymentFlow.freeInstallation && ' (Gratis Instalasi)'}
                                </p>
                            </div>
                            <ScheduleForm userId={lead.id} existingInstallation={lead.installation} technicians={technicians} />
                        </div>
                    )}
                </>
            )}

            {/* Step 3/4: Waiting for Installation (PENDING_INSTALL status) */}
            {lead.status === 'PENDING_INSTALL' && (
                <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Step 3: Menunggu Instalasi</h3>
                    <div className="bg-yellow-50 p-4 rounded-md mb-4">
                        <p className="text-sm text-yellow-800 mb-2">
                            Instalasi dijadwalkan pada: <strong>{lead.installation?.scheduledDate ? formatDate(lead.installation.scheduledDate) : '-'}</strong>
                        </p>
                        <p className="text-sm text-yellow-800">
                            Teknisi: <strong>{lead.installation?.technicianUser?.name || '-'}</strong>
                        </p>
                        <p className="text-sm text-yellow-600 mt-3">
                            Menunggu teknisi menyelesaikan instalasi...
                        </p>
                    </div>
                    <div className="border-t pt-4">
                        <p className="text-sm text-gray-600 mb-3">
                            <strong>Untuk Testing:</strong> Gunakan tombol di bawah untuk mensimulasikan teknisi menyelesaikan instalasi.
                        </p>
                        <CompleteInstallationButton userId={lead.id} />
                    </div>
                </div>
            )}

            {/* Step 4/5: After Installation - Check if first month payment required */}
            {(lead.status === 'INSTALLED' || lead.status === 'INSTALLED_PAYMENT_PENDING') && lead.assignedPaymentFlow && (
                <>
                    {/* Scenario A: First month payment required after install */}
                    {lead.assignedPaymentFlow.requiresFirstMonthPayment && lead.assignedPaymentFlow.firstMonthPaymentAfterInstall ? (
                        <>
                            {/* Step 4a: Generate First Month Invoice */}
                            {!firstMonthGate.hasInvoice && (
                                <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Step 4: Generate Invoice Bulan Pertama</h3>
                                    <div className="bg-green-50 p-3 rounded-md mb-4">
                                        <p className="text-sm text-green-800">
                                            ✅ Instalasi telah selesai!
                                        </p>
                                    </div>
                                    <GenerateInvoiceButton userId={lead.id} type="firstMonth" promoCode={lead.registeredPromoCode || undefined} />
                                </div>
                            )}

                            {/* Step 4b: Payment Gate - Waiting for First Month Payment */}
                            {firstMonthGate.hasInvoice && !firstMonthGate.isPaid && (
                                <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Step 4: Menunggu Pembayaran Bulan Pertama</h3>
                                    <PaymentGateCard
                                        invoice={firstMonthGate.invoice}
                                        customerName={lead.name}
                                        customerPhone={lead.phone}
                                    />
                                </div>
                            )}

                            {/* Step 5: Activation (unlocked after payment) */}
                            {firstMonthGate.isPaid && (
                                <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                                    <h3 className="text-lg font-medium text-gray-900 mb-4">Step 5: Aktivasi Pelanggan</h3>
                                    <div className="bg-green-50 p-4 rounded-md mb-4">
                                        <p className="text-sm text-green-800">
                                            ✅ Pembayaran bulan pertama sudah diterima. Sekarang Anda dapat mengaktifkan pelanggan.
                                        </p>
                                    </div>
                                    <ActivateForm
                                        userId={lead.id}
                                        currentStatus={lead.status}
                                        selectedPackageId={lead.selectedPackageId}
                                        assignedPaymentFlowId={lead.assignedPaymentFlowId}
                                    />
                                </div>
                            )}
                        </>
                    ) : (
                        /* Scenario B: No first month payment required - Direct activation */
                        <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Step 4: Aktivasi Pelanggan</h3>
                            <div className="bg-green-50 p-4 rounded-md mb-4">
                                <p className="text-sm text-green-800">
                                    ✅ Instalasi telah selesai! Sekarang Anda dapat mengaktifkan pelanggan.
                                </p>
                            </div>
                            <ActivateForm
                                userId={lead.id}
                                currentStatus={lead.status}
                                selectedPackageId={lead.selectedPackageId}
                                assignedPaymentFlowId={lead.assignedPaymentFlowId}
                            />
                        </div>
                    )}
                </>
            )}

            {/* Active Customer */}
            {lead.status === 'ACTIVE' && (
                <div className="bg-white shadow sm:rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium text-gray-900">Status Pelanggan</h3>
                        <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold">
                            ✅ Pelanggan Aktif
                        </span>
                    </div>
                </div>
            )}
            {/* Payment History */}
            <PaymentHistory userId={lead.id} />
        </div>
    );
}
