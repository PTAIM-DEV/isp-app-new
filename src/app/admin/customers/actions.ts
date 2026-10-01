'use server';

import { prisma } from '@/lib/prisma';
import { generateInvoice } from '@/lib/invoice-generator';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { hash } from 'bcryptjs';
import { evolutionApi } from '@/lib/evolution-api';

export async function createCustomer(formData: FormData) {
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const nik = formData.get('nik') as string | null;
    const address = formData.get('address') as string;
    const packageId = formData.get('packageId') as string;
    const paymentFlowId = formData.get('paymentFlowId') as string;
    const provinceId = formData.get('provinceId') as string;
    const cityId = formData.get('cityId') as string;
    const districtId = formData.get('districtId') as string;
    const villageId = formData.get('villageId') as string;
    const salesId = formData.get('salesId') as string | null;

    // Migration fields
    const isMigration = formData.get('isMigration') === 'true';
    const startCycleDate = formData.get('startCycleDate') as string;
    const billingCycle = formData.get('billingCycle') ? parseInt(formData.get('billingCycle') as string) : 30;

    // Promo code
    const promoCode = formData.get('promoCode') as string | null;
    const promoCodeUpper = promoCode ? promoCode.trim().toUpperCase() : null;

    try {
        // Check if phone already exists (excluding deleted)
        const existingUser = await prisma.user.findFirst({
            where: {
                phone,
                // deletedAt: null, // Check ALL users because unique constraint is global
            },
        });

        if (existingUser) {
            if (existingUser.deletedAt) {
                return { success: false, error: 'Nomor telepon terdaftar pada akun yang sudah dihapus. Hubungi admin untuk restore.' };
            }
            return { success: false, error: 'Nomor telepon sudah terdaftar' };
        }

        // Check if NIK already exists (if provided, excluding deleted)
        if (nik && nik.trim()) {
            const existingNIK = await prisma.user.findFirst({
                where: {
                    nik: nik.trim(),
                    // deletedAt: null,
                },
            });

            if (existingNIK) {
                return { success: false, error: 'NIK sudah terdaftar' };
            }
        }

        // Check if email already exists (if provided, excluding deleted)
        if (email && email.trim()) {
            const existingEmail = await prisma.user.findFirst({
                where: {
                    email: email.trim(),
                    // deletedAt: null,
                },
            });

            if (existingEmail) {
                if (existingEmail.deletedAt) {
                    return { success: false, error: 'Email terdaftar pada akun yang sudah dihapus.' };
                }
                return { success: false, error: 'Email sudah terdaftar' };
            }
        }

        // Validate promo code if provided
        let validatedPromo: Awaited<ReturnType<typeof prisma.promo.findUnique>> = null;
        if (promoCodeUpper) {
            const promo = await prisma.promo.findUnique({
                where: { code: promoCodeUpper },
            });

            if (!promo) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" tidak valid` };
            }

            if (!promo.isActive) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" sudah tidak aktif` };
            }

            // Check validity dates
            const now = new Date();
            if (promo.validFrom > now) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" belum berlaku` };
            }

            if (promo.validUntil && promo.validUntil < now) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" sudah kadaluarsa` };
            }

            // Check max uses
            if (promo.maxUses && promo.usedCount >= promo.maxUses) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" sudah mencapai batas penggunaan` };
            }

            // Check if applicable to selected package/flow
            if (packageId) {
                const applicablePackages = promo.applicableToPackageIds ? JSON.parse(promo.applicableToPackageIds) : [];
                if (applicablePackages.length > 0 && !applicablePackages.includes(packageId)) {
                    return { success: false, error: `Kode promo "${promoCodeUpper}" tidak berlaku untuk paket yang dipilih` };
                }
            }

            if (paymentFlowId) {
                const applicableFlows = promo.applicableToFlowIds ? JSON.parse(promo.applicableToFlowIds) : [];
                if (applicableFlows.length > 0 && !applicableFlows.includes(paymentFlowId)) {
                    return { success: false, error: `Kode promo "${promoCodeUpper}" tidak berlaku untuk payment flow yang dipilih` };
                }
            }

            validatedPromo = promo;
        }

        // Get package info for subscription
        const servicePackage = packageId ? await prisma.servicePackage.findUnique({
            where: { id: packageId },
        }) : null;

        if (!servicePackage) {
            return { success: false, error: 'Paket layanan tidak ditemukan' };
        }


        // Create user
        const user = await prisma.user.create({
            data: {
                name,
                phone,
                email: email?.trim() || undefined,
                address,
                role: 'CUSTOMER',
                status: isMigration ? 'ACTIVE' : 'LEAD', // Migration customers langsung ACTIVE
                selectedPackageId: packageId,
                assignedPaymentFlowId: paymentFlowId,
                registeredPromoCode: promoCodeUpper || undefined,
                provinceId: provinceId || undefined,
                cityId: cityId || undefined,
                districtId: districtId || undefined,
                villageId: villageId || undefined,
                salesPersonId: salesId || undefined,
                password: await hash('123456', 10), // Default password
                nik: nik?.trim() || undefined,
            },
        });

        // If migration customer, create subscription immediately
        if (isMigration) {
            const startDate = startCycleDate ? new Date(startCycleDate) : new Date();
            let nextBillingDate = new Date(startDate);
            nextBillingDate.setDate(nextBillingDate.getDate() + billingCycle);

            // Handle promo code for migration customers (BONUS_MONTHS)
            let prepaidCreditMonths = 0;
            let bonusMonthsPending = 0;
            let prepaidValidUntil: Date | null = null;

            if (validatedPromo && validatedPromo.type === 'BONUS_MONTHS' && validatedPromo.value && validatedPromo.cycleDuration) {
                // For BONUS_MONTHS promo: if customer pays for cycleDuration months, get bonus months
                // For migration, we assume they already paid, so we can apply bonus months
                prepaidCreditMonths = validatedPromo.cycleDuration;
                bonusMonthsPending = Number(validatedPromo.value);

                // Calculate prepaid valid until
                prepaidValidUntil = new Date(startDate);
                prepaidValidUntil.setMonth(prepaidValidUntil.getMonth() + prepaidCreditMonths);

                // Next billing date after prepaid + bonus
                nextBillingDate = new Date(prepaidValidUntil);
                nextBillingDate.setMonth(nextBillingDate.getMonth() + bonusMonthsPending);
            }

            await prisma.subscription.create({
                data: {
                    userId: user.id,
                    planName: servicePackage.name,
                    price: servicePackage.price,
                    billingCycle: billingCycle,
                    startDate: startDate,
                    activatedDate: startDate,
                    nextBillingDate: nextBillingDate,
                    paymentFlowId: paymentFlowId || undefined,
                    isTrialActive: false,
                    isPrepaidActive: validatedPromo?.type === 'BONUS_MONTHS' && prepaidCreditMonths > 0,
                    prepaidCreditMonths: prepaidCreditMonths,
                    bonusMonthsPending: bonusMonthsPending,
                    prepaidValidUntil: prepaidValidUntil,
                },
            });

            // Create PromoUsage record for migration customer if promo code used
            if (validatedPromo) {
                await prisma.promoUsage.create({
                    data: {
                        promoId: validatedPromo.id,
                        userId: user.id,
                    },
                });

                // Update promo used count
                await prisma.promo.update({
                    where: { id: validatedPromo.id },
                    data: { usedCount: { increment: 1 } },
                });
            }
        }

        // Return usage ID for next steps (Interactive Flow)
        revalidatePath('/admin/customers');
        return { success: true, userId: user.id };

    } catch (error: any) {
        console.error('Create customer error:', error);
        return { success: false, error: error.message || 'Gagal membuat pelanggan' };
    }
}

// --- Interactive Flow Actions ---

export async function createInstallationInvoiceAction(userId: string, amount: number) {
    try {
        if (!userId || amount <= 0) return { success: false, error: 'Invalid parameters' };

        await generateInvoice({
            userId: userId,
            type: 'INSTALLATION',
            category: 'INSTALLATION_FEE',
            amount: amount,
            dueDate: new Date(), // Due immediately
            description: 'Biaya Instalasi Internet',
        });

        revalidatePath(`/admin/customers/${userId}`);
        return { success: true };
    } catch (error: any) {
        console.error('[Installation Invoice] Error:', error);
        return { success: false, error: error.message || 'Gagal membuat invoice instalasi' };
    }
}

export async function getWelcomeMessagePreviewAction(userId: string) {
    try {
        const { getWelcomeMessagePreview } = await import('@/lib/whatsapp-welcome');
        const preview = await getWelcomeMessagePreview(userId);
        return { success: true, preview };
    } catch (error: any) {
        console.error('[Welcome Preview] Error:', error);
        return { success: false, error: 'Gagal generate preview message' };
    }
}

export async function sendCustomWelcomeMessageAction(userId: string, content: string) {
    try {
        const { sendWelcomeWhatsAppMessage } = await import('@/lib/whatsapp-welcome');
        // Force resend = true to allow manual sending even if already sent
        const result = await sendWelcomeWhatsAppMessage(userId, true, content);

        if (result) {
            return { success: true };
        } else {
            return { success: false, error: 'Gagal mengirim pesan (Internal Error)' };
        }
    } catch (error: any) {
        console.error('[Send Welcome] Error:', error);
        return { success: false, error: 'Gagal mengirim pesan' };
    }
}

export async function updateCustomer(userId: string, formData: FormData) {
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string;
    const nik = formData.get('nik') as string | null;
    const address = formData.get('address') as string;
    const packageId = formData.get('packageId') as string;
    const paymentFlowId = formData.get('paymentFlowId') as string;
    const provinceId = formData.get('provinceId') as string;
    const cityId = formData.get('cityId') as string;
    const districtId = formData.get('districtId') as string;
    const villageId = formData.get('villageId') as string;
    const postalCode = formData.get('postalCode') as string;
    const status = formData.get('status') as string;
    const salesId = formData.get('salesId') as string | null;
    const promoCode = formData.get('promoCode') as string | null;
    const promoCodeUpper = promoCode ? promoCode.trim().toUpperCase() : null;
    const latitude = formData.get('latitude') as string | null;
    const longitude = formData.get('longitude') as string | null;
    const password = formData.get('password') as string | null;

    try {
        // Check if phone already exists (excluding current user)
        if (phone) {
            const existingUser = await prisma.user.findFirst({
                where: {
                    phone,
                    id: { not: userId },
                    deletedAt: null,
                },
            });

            if (existingUser) {
                return { success: false, error: 'Nomor telepon sudah digunakan oleh pelanggan lain' };
            }
        }

        // Validate promo code if provided
        let validatedPromo: Awaited<ReturnType<typeof prisma.promo.findUnique>> = null;
        if (promoCodeUpper) {
            const promo = await prisma.promo.findUnique({
                where: { code: promoCodeUpper },
            });

            if (!promo) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" tidak valid` };
            }

            if (!promo.isActive) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" sudah tidak aktif` };
            }

            const now = new Date();
            if (promo.validFrom > now) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" belum berlaku` };
            }

            if (promo.validUntil && promo.validUntil < now) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" sudah kadaluarsa` };
            }

            if (promo.maxUses && promo.usedCount >= promo.maxUses) {
                return { success: false, error: `Kode promo "${promoCodeUpper}" sudah mencapai batas penggunaan` };
            }

            validatedPromo = promo;
        }

        // Prepare update data
        const updateData: any = {
            name: name || undefined,
            phone: phone || undefined,
            email: email || undefined,
            address: address || undefined,
            status: status ? (status as any) : undefined,
            selectedPackageId: packageId || undefined,
            assignedPaymentFlowId: paymentFlowId || undefined,
            registeredPromoCode: promoCodeUpper || undefined,
            provinceId: provinceId || undefined,
            cityId: cityId || undefined,
            districtId: districtId || undefined,
            villageId: villageId || undefined,
            postalCode: postalCode || undefined,
            salesPersonId: salesId || undefined,
            nik: nik?.trim() || undefined,
        };

        // Add latitude/longitude if provided
        if (latitude) {
            const lat = parseFloat(latitude);
            if (!isNaN(lat)) {
                updateData.latitude = lat;
            }
        }
        if (longitude) {
            const lng = parseFloat(longitude);
            if (!isNaN(lng)) {
                updateData.longitude = lng;
            }
        }

        // Update password if provided
        if (password && password.trim().length > 0) {
            updateData.password = await hash(password.trim(), 10);
        }

        // Update user
        await prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        // Update subscription if package changed
        if (packageId) {
            const servicePackage = await prisma.servicePackage.findUnique({
                where: { id: packageId },
            });

            if (servicePackage) {
                await prisma.subscription.updateMany({
                    where: { userId },
                    data: {
                        planName: servicePackage.name,
                        price: servicePackage.price,
                    },
                });
            }
        }

    } catch (error) {
        console.error('Update customer error:', error);
        return { success: false, error: 'Gagal mengupdate pelanggan' };
    }

    revalidatePath(`/admin/customers/${userId}`);
    revalidatePath('/admin/customers');
    return { success: true };
}

/**
 * Soft delete customer - move to Contact list
 * Sets deletedAt timestamp and copies contact info to Contact model
 */
export async function deleteCustomer(userId: string) {
    try {
        // Get user with all related data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: {
                province: true,
                city: true,
                district: true,
                village: true,
                salesPerson: true,
            },
        });

        if (!user) {
            return { success: false, error: 'Pelanggan tidak ditemukan' };
        }

        // Check if already deleted
        if (user.deletedAt) {
            return { success: false, error: 'Pelanggan sudah dihapus sebelumnya' };
        }

        // Copy contact info to Contact model (upsert by phone to avoid duplicates)
        await prisma.contact.upsert({
            where: { phone: user.phone },
            update: {
                name: user.name,
                email: user.email || undefined,
                address: user.address || undefined,
                notes: `Dihapus dari pelanggan pada ${new Date().toLocaleDateString('id-ID')}. Data sebelumnya: ${user.status}`,
                tags: ['DELETED_CUSTOMER'],
                source: 'CUSTOMER_DELETION',
                sourceId: userId,
                status: 'INACTIVE',
            },
            create: {
                name: user.name,
                phone: user.phone,
                email: user.email || undefined,
                address: user.address || undefined,
                notes: `Dihapus dari pelanggan pada ${new Date().toLocaleDateString('id-ID')}. Status sebelumnya: ${user.status}`,
                tags: ['DELETED_CUSTOMER'],
                source: 'CUSTOMER_DELETION',
                sourceId: userId,
                status: 'INACTIVE',
            },
        });

        // 1. Cancel UNPAID/OVERDUE Invoices
        const outstandingInvoices = await prisma.invoice.findMany({
            where: {
                userId: userId,
                status: { in: ['UNPAID', 'OVERDUE'] },
                deletedAt: null // Only active invoices
            }
        });

        for (const invoice of outstandingInvoices) {
            await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    status: 'CANCELLED',
                    description: (invoice.description || '') + ` [AUTO-CANCELLED: User Deleted]`,
                    // We DO NOT soft delete the invoice (deletedAt), just Cancelled status, 
                    // so it remains in history as a cancelled transaction.
                    // If we want to hide it completely, we could set deletedAt.
                    // Based on "cancel semua invoice", setting status CANCELLED is most appropriate.
                    // But to ensure it doesn't show up in "Overdue" queries that might check "deletedAt", we should consistency.
                    // The AI service query checks `status: UNPAID` (and will now check user.deletedAt).
                    // So changing status to CANCELLED is sufficient. 
                }
            });
        }

        // Soft delete user by setting deletedAt
        await prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: new Date(),
                status: 'INACTIVE', // Also set status to INACTIVE for clarity
            },
        });

        console.log(`[Delete Customer] Soft deleted user ${userId} (${user.name}) and cancelled ${outstandingInvoices.length} outstanding invoices.`);

        revalidatePath('/admin/customers');
        revalidatePath(`/admin/customers/${userId}`);

        return { success: true, message: `Pelanggan dihapus. ${outstandingInvoices.length} tagihan belum lunas telah dibatalkan.` };
    } catch (error: any) {
        console.error('[Delete Customer] Error:', error);
        return { success: false, error: error.message || 'Gagal menghapus pelanggan' };
    }
}

export async function restoreCustomer(userId: string) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            return { success: false, error: 'Pelanggan tidak ditemukan' };
        }

        if (!user.deletedAt) {
            return { success: false, error: 'Pelanggan tidak dalam status terhapus (deleted)' };
        }

        // Restore user
        await prisma.user.update({
            where: { id: userId },
            data: {
                deletedAt: null,
                status: 'ACTIVE', // Default to ACTIVE upon restore
            },
        });

        // Remove from Contact blacklist if exists (cleanup)
        // We leave the contact history but maybe we should update status there?
        await prisma.contact.updateMany({
            where: {
                phone: user.phone,
                tags: { has: 'DELETED_CUSTOMER' }
            },
            data: {
                status: 'CONVERTED', // Mark as converted back
                notes: `Direstore kembali menjadi pelanggan pada ${new Date().toLocaleDateString('id-ID')}`
            }
        });

        revalidatePath('/admin/customers');
        return { success: true, message: 'Pelanggan berhasil dipulihkan' };
    } catch (error: any) {
        console.error('[Restore Customer] Error:', error);
        return { success: false, error: error.message || 'Gagal memulihkan pelanggan' };
    }
}

export async function updateCustomerKTP(userId: string, ktpImageUrl: string) {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                ktpImageUrl: ktpImageUrl || null,
            },
        });

        revalidatePath(`/admin/customers/${userId}`);
        return { success: true };
    } catch (error) {
        console.error('Update KTP error:', error);
        return { success: false, error: 'Gagal mengupdate foto KTP' };
    }
}

export async function updateNextBillingDate(userId: string, nextBillingDate: string) {
    try {
        // Get user data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { subscription: true },
        });

        if (!user) {
            return { success: false, error: 'Pelanggan tidak ditemukan' };
        }

        const billingDate = new Date(nextBillingDate);

        // If subscription doesn't exist, create it
        if (!user.subscription) {
            if (!user.selectedPackageId) {
                return { success: false, error: 'Paket layanan belum dipilih. Silakan pilih paket terlebih dahulu.' };
            }

            const servicePackage = await prisma.servicePackage.findUnique({
                where: { id: user.selectedPackageId },
            });

            if (!servicePackage) {
                return { success: false, error: 'Paket layanan tidak ditemukan' };
            }

            // Create subscription with next billing date
            await prisma.subscription.create({
                data: {
                    userId: user.id,
                    planName: servicePackage.name,
                    price: servicePackage.price,
                    billingCycle: 30, // Default 30 hari
                    startDate: billingDate,
                    activatedDate: billingDate,
                    nextBillingDate: billingDate,
                    paymentFlowId: user.assignedPaymentFlowId || undefined,
                    isTrialActive: false,
                    isPrepaidActive: false,
                },
            });
        } else {
            // Update existing subscription
            await prisma.subscription.update({
                where: { userId },
                data: {
                    nextBillingDate: billingDate,
                },
            });
        }

        revalidatePath(`/admin/customers/${userId}`);
        return { success: true };
    } catch (error) {
        console.error('Update next billing date error:', error);
        return { success: false, error: 'Gagal mengupdate tanggal tagihan berikutnya' };
    }
}

export async function updateStartDate(userId: string, startDate: string) {
    try {
        // Get user data
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { subscription: true },
        });

        if (!user) {
            return { success: false, error: 'Pelanggan tidak ditemukan' };
        }

        if (!user.subscription) {
            return { success: false, error: 'Langganan tidak ditemukan. Silakan buat langganan terlebih dahulu.' };
        }

        const newStartDate = new Date(startDate);

        // Update subscription startDate
        await prisma.subscription.update({
            where: { userId },
            data: {
                startDate: newStartDate,
                // Also update activatedDate if it's the same as old startDate
                activatedDate: newStartDate,
            },
        });

        revalidatePath(`/admin/customers/${userId}`);
        return { success: true };
    } catch (error) {
        console.error('Update start date error:', error);
        return { success: false, error: 'Gagal mengupdate tanggal mulai langganan' };
    }
}

export async function createManualInvoice(
    userId: string,
    params: {
        dueDate: string;
        amount?: number;
        description?: string;
    }
) {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { subscription: true },
        });

        if (!user) {
            return { success: false, error: 'Pelanggan tidak ditemukan' };
        }

        if (!user.subscription) {
            return { success: false, error: 'Pelanggan belum memiliki langganan aktif' };
        }

        if (!params.dueDate) {
            return { success: false, error: 'Tanggal jatuh tempo wajib diisi' };
        }

        const dueDate = new Date(params.dueDate);
        if (Number.isNaN(dueDate.getTime())) {
            return { success: false, error: 'Format tanggal jatuh tempo tidak valid' };
        }
        dueDate.setHours(0, 0, 0, 0);

        const amount = params.amount ?? Number(user.subscription.price);
        if (!Number.isFinite(amount) || amount <= 0) {
            return { success: false, error: 'Nominal tagihan tidak valid' };
        }

        // Flag anti duplikasi: cek invoice lain pada rentang ±1 hari dari dueDate
        const startRange = new Date(dueDate);
        startRange.setDate(startRange.getDate() - 1);
        startRange.setHours(0, 0, 0, 0);

        const endRange = new Date(dueDate);
        endRange.setDate(endRange.getDate() + 1);
        endRange.setHours(23, 59, 59, 999);

        const existingInvoice = await prisma.invoice.findFirst({
            where: {
                userId,
                category: 'REGULAR_MONTHLY',
                status: { in: ['UNPAID', 'OVERDUE', 'PAID'] },
                dueDate: { gte: startRange, lte: endRange },
                deletedAt: null,
            },
            orderBy: { createdAt: 'desc' },
        });

        if (existingInvoice) {
            return {
                success: false,
                error: 'Invoice untuk periode ini sudah ada, pembuatan dibatalkan.',
                invoiceId: existingInvoice.id,
                invoiceNumber: existingInvoice.invoiceNumber || existingInvoice.id,
            };
        }

        const invoice = await generateInvoice({
            userId,
            type: 'MONTHLY',
            category: 'REGULAR_MONTHLY',
            amount,
            dueDate,
            description: params.description || '[Manual] Invoice bulanan dibuat oleh admin',
        });

        // Update nextBillingDate agar siklus berikutnya tetap maju
        const nextBillingDate = new Date(dueDate);
        nextBillingDate.setDate(nextBillingDate.getDate() + user.subscription.billingCycle);
        await prisma.subscription.update({
            where: { id: user.subscription.id },
            data: { nextBillingDate },
        });

        revalidatePath(`/admin/customers/${userId}`);
        return {
            success: true,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber || invoice.id,
        };
    } catch (error) {
        console.error('[Create Manual Invoice] Error:', error);
        return { success: false, error: 'Gagal membuat invoice manual' };
    }
}


export async function sendSalesStatusInquiry(customerId: string) {
    try {
        // 1. Fetch Customer and their Sales
        const customer = await prisma.user.findUnique({
            where: { id: customerId },
            include: {
                salesPerson: true
            }
        });

        if (!customer) {
            return { success: false, error: 'Pelanggan tidak ditemukan' };
        }

        if (!customer.salesPerson) {
            return { success: false, error: 'Pelanggan tidak memiliki Sales yang terdaftar' };
        }

        if (!customer.salesPerson.phone) {
            return { success: false, error: 'Sales tidak memiliki nomor telepon' };
        }

        // 2. Fetch Template
        const templateSetting = await prisma.systemSetting.findUnique({
            where: { key: 'whatsapp_sales_status_inquiry_template' }
        });

        // Default template if not set
        let message = templateSetting?.value || 'Halo {{salesName}}, status pelanggan *{{customerName}}* ({{phone}}) saat ini *{{status}}*. Mohon konfirmasi apakah masih lanjut berlangganan?';

        // 3. Replace Variables
        message = message
            .replace(/{{salesName}}/g, customer.salesPerson.name)
            .replace(/{{customerName}}/g, customer.name)
            .replace(/{{status}}/g, customer.status)
            .replace(/{{email}}/g, customer.email || '-')
            .replace(/{{phone}}/g, customer.phone);

        // 4. Send Message via Evolution API
        const jid = customer.salesPerson.phone.replace(/[^0-9]/g, '') + '@s.whatsapp.net';

        // Start typing presence for realism
        await evolutionApi.sendPresence(jid, 'composing', 2000);

        // Send the text
        await evolutionApi.sendTextMessage(jid, message);

        // 5. Update timestamp
        await prisma.user.update({
            where: { id: customerId },
            data: { lastSalesInquirySentAt: new Date() }
        });

        revalidatePath('/admin/customers');

        return {
            success: true,
            message: `Pesan berhasil dikirim ke ${customer.salesPerson.name}`
        };

    } catch (error: any) {
        console.error('Send sales status inquiry error:', error);
        return { success: false, error: error.message || 'Gagal mengirim pesan' };
    }
}
