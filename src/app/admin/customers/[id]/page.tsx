import { prisma } from '@/lib/prisma';
import { formatDate } from '@/lib/utils';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { KTPViewer } from './ktp-viewer';
import { SignatureViewer } from './signature-viewer';
import { EditForm } from './edit-form';
import { KTPUpload } from './ktp-upload';
import { EditBillingDate } from './edit-billing-date';
import { EditStartDate } from './edit-start-date';
import { SendWelcomeButton } from './send-welcome-button';
import { WelcomeMessageLog } from './welcome-message-log';
import { DeleteCustomerButton } from './delete-customer-button';
import { ManualInvoiceButton } from './manual-invoice-button';
import { BackButton } from './back-button';
import InvoiceActions from './invoice-actions';

interface PageProps {
    params: Promise<{ id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function CustomerDetailsPage({ params }: PageProps) {
    const { id } = await params;

    const customer = await prisma.user.findFirst({
        where: {
            id,
            deletedAt: null, // Only get non-deleted customers
        },
        include: {
            subscription: true,
            invoices: {
                orderBy: { createdAt: 'desc' },
            },
            installation: true,
            assignedPaymentFlow: true,
            province: true,
            city: true,
            district: true,
            village: true,
            salesPerson: true,
        },
    });

    // Get welcome message logs from WhatsAppOutgoing and sync flag
    if (!customer) {
        notFound();
    }

    let whatsappLogs: Array<{
        id: string;
        content: string;
        status: string;
        createdAt: Date;
    }> = [];
    let whatsappSent = customer.welcomeWhatsappSent || false;
    let whatsappSentAt = customer.welcomeWhatsappSentAt;

    if (customer.phone) {
        // Clean phone number to match JID format
        let cleanPhone = customer.phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1);
        } else if (!cleanPhone.startsWith('62')) {
            cleanPhone = '62' + cleanPhone;
        }
        const jid = `${cleanPhone}@s.whatsapp.net`;

        const logs = await prisma.whatsAppOutgoing.findMany({
            where: {
                jid,
                content: {
                    contains: 'Selamat datang',
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            take: 5, // Limit to last 5 welcome messages
        });

        whatsappLogs = logs.map(log => ({
            id: log.id,
            content: log.content,
            status: log.status,
            createdAt: log.createdAt,
        }));

        // Sync flag with log: if there's a SENT message in log but flag is false, update flag
        const sentLog = logs.find(log => log.status === 'SENT');
        if (sentLog && !whatsappSent) {
            // Update flag in database (async, don't wait)
            prisma.user.update({
                where: { id: customer.id },
                data: {
                    welcomeWhatsappSent: true,
                    welcomeWhatsappSentAt: sentLog.createdAt,
                },
            }).catch(err => {
                console.error('[Welcome Log] Error syncing flag:', err);
            });

            // Update local variables for display
            whatsappSent = true;
            whatsappSentAt = sentLog.createdAt;
        }
    }

    // Get selected package info if subscription doesn't exist
    let selectedPackage: Awaited<ReturnType<typeof prisma.servicePackage.findUnique>> = null;
    if (!customer.subscription && customer.selectedPackageId) {
        selectedPackage = await prisma.servicePackage.findUnique({
            where: { id: customer.selectedPackageId },
        });
    }

    // Fetch data for edit form
    const packages = await prisma.servicePackage.findMany({
        where: { isActive: true },
    });

    const paymentFlows = await prisma.paymentFlow.findMany({
        where: { isActive: true },
    });

    const provinces = await prisma.province.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });

    const sales = await prisma.user.findMany({
        where: {
            role: 'SALES' as const,
            status: 'ACTIVE'
        },
        orderBy: { name: 'asc' },
    });

    // Serialize Decimal fields
    const serializedPackages = packages.map(pkg => ({
        ...pkg,
        price: Number(pkg.price),
    }));

    const serializedPaymentFlows = paymentFlows.map(flow => ({
        ...flow,
        installationFeeAmount: flow.installationFeeAmount ? Number(flow.installationFeeAmount) : null,
    }));

    // Serialize invoices to remove Decimal fields (do this first)
    const serializedInvoices = customer.invoices.map((invoice) => ({
        ...invoice,
        amount: Number(invoice.amount),
        subtotal: invoice.subtotal ? Number(invoice.subtotal) : null,
        taxAmount: invoice.taxAmount ? Number(invoice.taxAmount) : null,
        feeAmount: invoice.feeAmount ? Number(invoice.feeAmount) : null,
    }));

    // Serialize customer data for EditForm (remove Decimal fields)
    const serializedCustomer = {
        ...customer,
        subscription: customer.subscription ? {
            ...customer.subscription,
            price: Number(customer.subscription.price),
        } : null,
        assignedPaymentFlow: customer.assignedPaymentFlow ? {
            ...customer.assignedPaymentFlow,
            installationFeeAmount: customer.assignedPaymentFlow.installationFeeAmount
                ? Number(customer.assignedPaymentFlow.installationFeeAmount)
                : null,
        } : null,
        invoices: serializedInvoices,
    };

    // Serialize subscription to remove Decimal fields
    const serializedSubscription = customer.subscription ? {
        ...customer.subscription,
        price: Number(customer.subscription.price),
    } : null;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Detail Pelanggan</h2>
                <div className="flex items-center space-x-3">
                    <EditForm
                        customer={serializedCustomer}
                        packages={serializedPackages}
                        paymentFlows={serializedPaymentFlows}
                        provinces={provinces}
                        sales={sales}
                    />
                    <DeleteCustomerButton
                        customerId={customer.id}
                        customerName={customer.name}
                    />
                    <BackButton />
                </div>
            </div>

            {/* Welcome Message Status - Compact Design */}
            <div className="mb-6">
                <WelcomeMessageLog
                    customerId={customer.id}
                    customerName={customer.name}
                    customerPhone={customer.phone}
                    customerEmail={customer.email}
                    whatsappSent={whatsappSent}
                    whatsappSentAt={whatsappSentAt}
                    emailSent={customer.welcomeEmailSent || false}
                    emailSentAt={customer.welcomeEmailSentAt}
                    whatsappLogs={whatsappLogs}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Informasi Akun</h3>
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Nama</dt>
                            <dd className="mt-1 text-sm text-gray-900">{customer.name}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Status</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                    customer.status === 'BLOCKED' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {customer.status}
                                </span>
                            </dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Email</dt>
                            <dd className="mt-1 text-sm text-gray-900">{customer.email || '-'}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Telepon</dt>
                            <dd className="mt-1 text-sm text-gray-900">{customer.phone}</dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">NIK</dt>
                            <dd className="mt-1 text-sm text-gray-900">{'nik' in customer ? (customer as { nik?: string | null }).nik || '-' : '-'}</dd>
                        </div>
                        <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Alamat</dt>
                            <dd className="mt-1 text-sm text-gray-900">{customer.address || '-'}</dd>
                        </div>
                        {customer.province && (
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Provinsi</dt>
                                <dd className="mt-1 text-sm text-gray-900">{customer.province.name}</dd>
                            </div>
                        )}
                        {customer.city && (
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Kota/Kabupaten</dt>
                                <dd className="mt-1 text-sm text-gray-900">{customer.city.name}</dd>
                            </div>
                        )}
                        {customer.district && (
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Kecamatan</dt>
                                <dd className="mt-1 text-sm text-gray-900">{customer.district.name}</dd>
                            </div>
                        )}
                        {customer.village && (
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Kelurahan/Desa</dt>
                                <dd className="mt-1 text-sm text-gray-900">{customer.village.name}</dd>
                            </div>
                        )}
                        {customer.postalCode && (
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Kode Pos</dt>
                                <dd className="mt-1 text-sm text-gray-900">{customer.postalCode}</dd>
                            </div>
                        )}
                        {(customer.latitude && customer.longitude) && (
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Koordinat Lokasi</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    <a
                                        href={`https://www.google.com/maps?q=${customer.latitude},${customer.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-indigo-600 hover:text-indigo-900"
                                    >
                                        {customer.latitude}, {customer.longitude}
                                        <svg className="inline-block ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </dd>
                            </div>
                        )}
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Payment Flow</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {customer.assignedPaymentFlow ? customer.assignedPaymentFlow.name : '-'}
                            </dd>
                        </div>
                        <div className="sm:col-span-1">
                            <dt className="text-sm font-medium text-gray-500">Kode Promo</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                                {customer.registeredPromoCode ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                        {customer.registeredPromoCode}
                                    </span>
                                ) : (
                                    '-'
                                )}
                            </dd>
                        </div>
                        {customer.salesPerson && (
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Sales</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {customer.salesPerson.name}
                                    </span>
                                </dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* Subscription Info */}
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Langganan</h3>
                    {serializedSubscription ? (
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Paket</dt>
                                <dd className="mt-1 text-sm text-gray-900">{serializedSubscription.planName}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Harga</dt>
                                <dd className="mt-1 text-sm text-gray-900">Rp {serializedSubscription.price.toLocaleString('id-ID')}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Billing Cycle</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {serializedSubscription.billingCycle === 30 ? '30 Hari (Bulanan)' :
                                        serializedSubscription.billingCycle === 60 ? '60 Hari (2 Bulan)' :
                                            serializedSubscription.billingCycle === 90 ? '90 Hari (3 Bulan)' :
                                                serializedSubscription.billingCycle === 180 ? '180 Hari (6 Bulan)' :
                                                    serializedSubscription.billingCycle === 365 ? '365 Hari (Tahunan)' :
                                                        `${serializedSubscription.billingCycle} Hari`}
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Status Langganan</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {serializedSubscription.isTrialActive ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                            Trial Aktif
                                        </span>
                                    ) : serializedSubscription.isPrepaidActive ? (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                            Prepaid Aktif
                                        </span>
                                    ) : (
                                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                            Aktif
                                        </span>
                                    )}
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Mulai Langganan</dt>
                                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                                    {serializedSubscription.startDate ? formatDate(serializedSubscription.startDate) : '-'}
                                    {serializedSubscription.startDate && (
                                        <EditStartDate
                                            userId={customer.id}
                                            currentDate={serializedSubscription.startDate}
                                        />
                                    )}
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Tagihan Berikutnya</dt>
                                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                                    {serializedSubscription.nextBillingDate ? formatDate(serializedSubscription.nextBillingDate) : '-'}
                                    <EditBillingDate
                                        userId={customer.id}
                                        currentDate={serializedSubscription.nextBillingDate}
                                    />
                                </dd>
                            </div>
                            {serializedSubscription.isTrialActive && serializedSubscription.trialEndDate && (
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Trial Berakhir</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{formatDate(serializedSubscription.trialEndDate)}</dd>
                                </div>
                            )}
                            {serializedSubscription.isPrepaidActive && serializedSubscription.prepaidValidUntil && (
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Prepaid Berakhir</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{formatDate(serializedSubscription.prepaidValidUntil)}</dd>
                                </div>
                            )}
                            {serializedSubscription.prepaidCreditMonths > 0 && (
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Sisa Prepaid</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{serializedSubscription.prepaidCreditMonths} Bulan</dd>
                                </div>
                            )}
                            {serializedSubscription.bonusMonthsPending > 0 && (
                                <div className="sm:col-span-1">
                                    <dt className="text-sm font-medium text-gray-500">Bonus Bulan</dt>
                                    <dd className="mt-1 text-sm text-gray-900">{serializedSubscription.bonusMonthsPending} Bulan</dd>
                                </div>
                            )}
                        </dl>
                    ) : selectedPackage ? (
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Paket yang Dipilih</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedPackage.name}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Kecepatan</dt>
                                <dd className="mt-1 text-sm text-gray-900">{selectedPackage.speed}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Harga</dt>
                                <dd className="mt-1 text-sm text-gray-900">Rp {Number(selectedPackage.price).toLocaleString('id-ID')}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Billing Cycle</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    {(() => {
                                        // Default billing cycle adalah 30 hari (bulanan)
                                        const defaultBillingCycle = 30;
                                        return defaultBillingCycle === 30 ? '30 Hari (Bulanan)' :
                                            defaultBillingCycle === 60 ? '60 Hari (2 Bulan)' :
                                                defaultBillingCycle === 90 ? '90 Hari (3 Bulan)' :
                                                    defaultBillingCycle === 180 ? '180 Hari (6 Bulan)' :
                                                        defaultBillingCycle === 365 ? '365 Hari (Tahunan)' :
                                                            `${defaultBillingCycle} Hari`;
                                    })()}
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Status</dt>
                                <dd className="mt-1 text-sm text-gray-900">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                        customer.status === 'BLOCKED' ? 'bg-red-100 text-red-800' :
                                            customer.status === 'INSTALLED' ? 'bg-blue-100 text-blue-800' :
                                                customer.status === 'INSTALLED_PAYMENT_PENDING' ? 'bg-orange-100 text-orange-800' :
                                                    customer.status === 'PENDING_INSTALL' ? 'bg-yellow-100 text-yellow-800' :
                                                        customer.status === 'LEAD' ? 'bg-gray-100 text-gray-800' :
                                                            'bg-gray-100 text-gray-800'
                                        }`}>
                                        {customer.status === 'ACTIVE' ? 'Aktif' :
                                            customer.status === 'BLOCKED' ? 'Diblokir' :
                                                customer.status === 'INSTALLED' ? 'Terpasang' :
                                                    customer.status === 'INSTALLED_PAYMENT_PENDING' ? 'Menunggu Pembayaran' :
                                                        customer.status === 'PENDING_INSTALL' ? 'Menunggu Instalasi' :
                                                            customer.status === 'LEAD' ? 'Belum Aktif' :
                                                                customer.status}
                                    </span>
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Tagihan Berikutnya</dt>
                                <dd className="mt-1 text-sm text-gray-900 flex items-center gap-2">
                                    <span>-</span>
                                    <EditBillingDate
                                        userId={customer.id}
                                        currentDate={null}
                                    />
                                </dd>
                            </div>
                            <div className="sm:col-span-2">
                                <dt className="text-sm font-medium text-gray-500">Keterangan</dt>
                                <dd className="mt-1 text-sm text-gray-500">
                                    Paket sudah dipilih namun langganan belum diaktifkan. Klik tombol "Set" untuk membuat langganan dan mengatur tanggal tagihan berikutnya.
                                </dd>
                            </div>
                        </dl>
                    ) : (
                        <p className="text-sm text-gray-500">Belum ada paket langganan yang dipilih.</p>
                    )}
                </div>
            </div>

            {/* Documents Section */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* KTP Photo */}
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-gray-900">Foto KTP / Identitas</h3>
                    </div>
                    {customer.ktpImageUrl ? (
                        <div className="space-y-3">
                            <KTPViewer ktpImageUrl={customer.ktpImageUrl} />
                            <div className="border-t pt-3">
                                <p className="text-sm text-gray-600 mb-2">Upload foto KTP baru:</p>
                                <KTPUpload
                                    customerId={customer.id}
                                    currentKtpUrl={customer.ktpImageUrl}
                                />
                            </div>
                        </div>
                    ) : (
                        <div>
                            <p className="text-sm text-gray-500 mb-4">Foto KTP belum diupload. Silakan upload foto KTP pelanggan.</p>
                            <KTPUpload
                                customerId={customer.id}
                                currentKtpUrl={null}
                            />
                        </div>
                    )}
                </div>

                {/* Digital Signature */}
                <div className="bg-white shadow sm:rounded-lg p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Tanda Tangan Digital</h3>
                    <SignatureViewer signatureData={customer.signatureData} />
                </div>
            </div>

            {/* Invoice History */}
            <div className="mt-6 bg-white shadow sm:rounded-lg overflow-hidden">
                <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">Riwayat Tagihan</h3>
                    <ManualInvoiceButton
                        userId={customer.id}
                        defaultAmount={serializedSubscription ? serializedSubscription.price : null}
                        defaultDueDate={serializedSubscription?.nextBillingDate ? serializedSubscription.nextBillingDate.toISOString() : null}
                        hasSubscription={!!serializedSubscription}
                    />
                </div>
                <div className="border-t border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jatuh Tempo</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dibayar Pada</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Catatan</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {serializedInvoices.map((invoice) => (
                                <tr key={invoice.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{invoice.id.slice(-6).toUpperCase()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Rp {Number(invoice.amount).toLocaleString('id-ID')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${invoice.status === 'PAID' ? 'bg-green-100 text-green-800' :
                                            invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {invoice.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(invoice.dueDate)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{invoice.paidAt ? formatDate(invoice.paidAt) : '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {invoice.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <InvoiceActions invoice={invoice} />
                                    </td>
                                </tr>
                            ))}
                            {serializedInvoices.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">Belum ada tagihan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
