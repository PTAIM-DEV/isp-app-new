import { prisma } from '@/lib/prisma';
import { createInvoice as createXenditInvoice } from '@/lib/xendit';
import { generateInvoiceNumber, getInvoiceDescription, calculatePrepaidValidUntil, calculateTrialEndDate } from './invoice-utils';
import { InvoiceType, InvoiceCategory } from '@prisma/client';
import { schedulePaymentReminders } from './reminder-scheduler';

interface GenerateInvoiceParams {
    userId: string;
    type: InvoiceType;
    category: InvoiceCategory;
    amount: number;
    dueDate: Date;
    description?: string;
    prepaidMonths?: number;
    bonusMonths?: number;
    trialDays?: number;
    promoCode?: string;
}

/**
 * Generate invoice dengan Xendit integration
 */
/**
 * Calculate invoice details without creating it
 */
export async function calculateInvoiceDetails(params: GenerateInvoiceParams) {
    const {
        userId,
        type,
        category,
        amount,
        prepaidMonths,
        bonusMonths,
        promoCode,
        description,
    } = params;

    // Get user data
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
    });

    if (!user) {
        throw new Error('User not found');
    }

    // Fetch service package if available
    let servicePackage: Awaited<ReturnType<typeof prisma.servicePackage.findUnique>> = null;
    if (user.selectedPackageId) {
        servicePackage = await prisma.servicePackage.findUnique({
            where: { id: user.selectedPackageId },
        });
    }

    // Get description
    const invoiceDescription = description || getInvoiceDescription(type, category, prepaidMonths, bonusMonths);

    // Handle promo code if provided
    let finalAmount = amount;
    let appliedPromo: any = null;

    console.log('[calculateInvoiceDetails] Input:', { amount, promoCode, category });

    if (promoCode) {
        const promo = await prisma.promo.findUnique({
            where: { code: promoCode },
        });

        if (promo && promo.isActive) {
            // Check validity
            const now = new Date();
            if (promo.validFrom <= now && (!promo.validUntil || promo.validUntil >= now)) {
                // Check max uses
                if (!promo.maxUses || promo.usedCount < promo.maxUses) {
                    // Apply promo based on type
                    if (promo.type === 'DISCOUNT_PERCENT' && promo.value) {
                        // Cap at 30%
                        const discountPercent = Math.min(Number(promo.value), 30);
                        const discount = amount * (discountPercent / 100);
                        finalAmount = amount - discount;
                        appliedPromo = promo;
                    } else if (promo.type === 'DISCOUNT_AMOUNT' && promo.value) {
                        // Cap at 30% of amount
                        const maxDiscount = amount * 0.30;
                        const discount = Math.min(Number(promo.value), maxDiscount);
                        finalAmount = Math.max(0, amount - discount);
                        appliedPromo = promo;
                    } else if (promo.type === 'FREE_INSTALLATION' && category === 'INSTALLATION_FEE') {
                        finalAmount = 0;
                        appliedPromo = promo;
                    } else if (promo.type === 'BONUS_MONTHS') {
                        // BONUS_MONTHS is handled differently - it affects prepaidMonths and bonusMonths
                        // This will be processed later in the function
                        appliedPromo = promo;
                    }
                }
            }
        }
    }

    // Handle BONUS_MONTHS promo type
    let actualPrepaidMonths = prepaidMonths;
    let actualBonusMonths = bonusMonths;
    let actualCategory = category;

    if (appliedPromo && appliedPromo.type === 'BONUS_MONTHS') {
        if (!appliedPromo.cycleDuration) {
            console.error('[Invoice] BONUS_MONTHS promo missing cycleDuration:', appliedPromo.code);
        } else {
            // User must pay for cycleDuration months upfront
            // If service package is available, use its price as base amount
            // Otherwise fall back to the passed amount (which might be incorrect if it's installation fee)
            const baseAmount = servicePackage ? Number(servicePackage.price) : amount;
            finalAmount = baseAmount * appliedPromo.cycleDuration;
            actualPrepaidMonths = appliedPromo.cycleDuration;
            actualBonusMonths = Number(appliedPromo.value || 0);

            // Update category to reflect prepaid nature
            if (appliedPromo.cycleDuration === 3) {
                actualCategory = 'PREPAID_3_MONTHS';
            } else if (appliedPromo.cycleDuration === 6) {
                actualCategory = 'PREPAID_6_MONTHS';
            } else if (appliedPromo.cycleDuration === 12) {
                actualCategory = 'PREPAID_12_MONTHS';
            }
        }
    }

    // Get system settings for admin fee
    const adminFeeSetting = await prisma.systemSetting.findUnique({
        where: { key: 'xendit_admin_fee' }
    });
    const adminFee = Number(adminFeeSetting?.value || 5000);

    // Check if price includes PPN
    let priceIncludesPPN = false;
    if (servicePackage) {
        priceIncludesPPN = servicePackage.priceIncludesPPN;
    } else if (user.subscription) {
        const pkg = await prisma.servicePackage.findFirst({
            where: { name: user.subscription.planName }
        });
        if (pkg) priceIncludesPPN = pkg.priceIncludesPPN;
    }

    // Calculate amounts
    let subtotal = finalAmount;
    let taxAmount = 0;
    let totalAmount = finalAmount;

    if (['FIRST_MONTH', 'REGULAR_MONTHLY', 'PREPAID_3_MONTHS', 'PREPAID_6_MONTHS', 'PREPAID_12_MONTHS'].includes(actualCategory)) {
        if (priceIncludesPPN) {
            subtotal = finalAmount / 1.11;
            taxAmount = finalAmount - subtotal;
        } else {
            subtotal = finalAmount;
            taxAmount = finalAmount * 0.11;
            totalAmount = finalAmount + taxAmount;
        }
    }

    // Add Admin Fee
    const feeAmount = adminFee;
    totalAmount += feeAmount;

    return {
        user,
        servicePackage,
        invoiceDescription,
        appliedPromo,
        finalAmount,
        actualCategory,
        actualPrepaidMonths,
        actualBonusMonths,
        subtotal,
        taxAmount,
        feeAmount,
        totalAmount,
        priceIncludesPPN
    };
}

/**
 * Generate invoice dengan Xendit integration
 */
export async function generateInvoice(params: GenerateInvoiceParams) {
    const {
        userId,
        type,
        dueDate,
    } = params;

    // Calculate details
    const details = await calculateInvoiceDetails(params);
    const {
        user,
        invoiceDescription,
        appliedPromo,
        finalAmount,
        actualCategory,
        actualPrepaidMonths,
        actualBonusMonths,
        subtotal,
        taxAmount,
        feeAmount,
        totalAmount,
    } = details;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber(type);

    // Create invoice in database
    const invoice = await prisma.invoice.create({
        data: {
            invoiceNumber,
            userId,
            type,
            category: actualCategory,
            amount: totalAmount, // Total to be paid
            subtotal,
            taxAmount,
            feeAmount,
            dueDate,
            description: invoiceDescription,
            bonusMonths: actualBonusMonths || null,
            validUntil: actualPrepaidMonths ? calculatePrepaidValidUntil(actualPrepaidMonths, actualBonusMonths || 0) : null,
        },
    });

    // Link promo usage to invoice if exists
    if (appliedPromo) {
        const promoUsage = await prisma.promoUsage.create({
            data: {
                promoId: appliedPromo.id,
                userId: user.id,
                invoiceId: invoice.id,
            },
        });

        // Update promo used count
        await prisma.promo.update({
            where: { id: appliedPromo.id },
            data: { usedCount: { increment: 1 } },
        });
    }

    // Create Xendit invoice if amount > 0
    if (finalAmount > 0) {
        try {
            // Get package name for item description
            let itemName = 'Internet Broadband';

            if (actualCategory === 'INSTALLATION_FEE') {
                itemName = 'Biaya Instalasi Internet';
            } else if (user.subscription) {
                itemName = `Internet Broadband ${user.subscription.planName}`;
            } else if (user.selectedPackageId) {
                const pkg = await prisma.servicePackage.findUnique({
                    where: { id: user.selectedPackageId }
                });
                if (pkg) {
                    itemName = `Internet Broadband ${pkg.name}`;
                }
            }

            // Get location data
            let provinceName = 'Sulawesi Utara';
            let cityName = 'Kab Minut';
            let postalCode = '95370';

            if (user.provinceId) {
                const province = await prisma.province.findUnique({
                    where: { id: user.provinceId }
                });
                if (province) provinceName = province.name;
            }

            if (user.cityId) {
                const city = await prisma.city.findUnique({
                    where: { id: user.cityId }
                });
                if (city) cityName = city.name;
            }

            if (user.postalCode) {
                postalCode = user.postalCode;
            }

            const fees: Array<{ type: string; value: number }> = [];
            if (taxAmount > 0) {
                fees.push({ type: 'PPN 11%', value: Math.round(taxAmount) });
            }
            if (feeAmount > 0) {
                fees.push({ type: 'Biaya Admin', value: Math.round(feeAmount) });
            }

            // Build enhanced description with customer info and package description
            // Format: "Nama Customer - no tel [phone] dengan ID [user.id] untuk pembayaran [invoiceDescription]"
            const enhancedDescription = `${user.name} - no tel ${user.phone} dengan ID ${user.id} untuk pembayaran ${invoiceDescription}`;

            const xenditInvoice = await createXenditInvoice({
                externalId: `${user.name}.${user.phone}-${actualCategory}`,
                amount: totalAmount,
                description: enhancedDescription,
                customerName: user.name,
                customerEmail: user.email || `${user.phone}@example.com`,
                customerPhone: user.phone,
                customerAddress: user.address || 'Alamat belum diisi',
                provinceName,
                cityName,
                postalCode,
                itemName,
                itemPrice: subtotal, // Base price without tax/fees
                itemQuantity: 1,
                fees,
            });

            await prisma.invoice.update({
                where: { id: invoice.id },
                data: {
                    xenditId: xenditInvoice.id,
                    xenditUrl: xenditInvoice.invoice_url,
                },
            });
        } catch (error) {
            console.error('Error creating Xendit invoice:', error);
            // Continue even if Xendit fails - invoice is still created in DB
        }
    }

    // Schedule payment reminders automatically
    // Only schedule for MONTHLY invoices (not installation or prepaid)
    if (type === 'MONTHLY' && actualCategory === 'REGULAR_MONTHLY') {
        try {
            await schedulePaymentReminders(invoice.id, dueDate);
            console.log(`[Invoice Generator] Scheduled payment reminders for invoice ${invoice.invoiceNumber}`);
        } catch (error) {
            console.error(`[Invoice Generator] Error scheduling reminders for invoice ${invoice.id}:`, error);
            // Don't fail invoice creation if reminder scheduling fails
        }
    }

    return invoice;
}

/**
 * Generate installation invoice berdasarkan PaymentFlow
 */
export async function generateInstallationInvoice(userId: string, paymentFlowId: string, promoCode?: string) {
    const paymentFlow = await prisma.paymentFlow.findUnique({
        where: { id: paymentFlowId },
    });

    if (!paymentFlow) {
        throw new Error('PaymentFlow not found');
    }

    if (!paymentFlow.requiresInstallationPayment || paymentFlow.freeInstallation) {
        return null; // No installation invoice needed
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    return await generateInvoice({
        userId,
        type: 'INSTALLATION',
        category: 'INSTALLATION_FEE',
        amount: Number(paymentFlow.installationFeeAmount || 0),
        dueDate,
        promoCode,
    });
}

/**
 * Preview installation invoice details
 */
export async function previewInstallationInvoice(userId: string, paymentFlowId: string, promoCode?: string) {
    const paymentFlow = await prisma.paymentFlow.findUnique({
        where: { id: paymentFlowId },
    });

    if (!paymentFlow) {
        throw new Error('PaymentFlow not found');
    }

    if (!paymentFlow.requiresInstallationPayment || paymentFlow.freeInstallation) {
        return null;
    }

    return await calculateInvoiceDetails({
        userId,
        type: 'INSTALLATION',
        category: 'INSTALLATION_FEE',
        amount: Number(paymentFlow.installationFeeAmount || 0),
        dueDate: new Date(), // Dummy date for preview
        promoCode,
    });
}

/**
 * Generate first month invoice setelah instalasi selesai
 */
export async function generateFirstMonthInvoice(userId: string, paymentFlowId: string, promoCode?: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
    });

    if (!user) {
        throw new Error('User not found');
    }

    const paymentFlow = await prisma.paymentFlow.findUnique({
        where: { id: paymentFlowId },
    });

    if (!paymentFlow) {
        throw new Error('PaymentFlow not found');
    }

    if (!paymentFlow.requiresFirstMonthPayment) {
        return null; // No first month payment needed
    }

    // Get package info - either from subscription or selectedPackageId
    let packagePrice: number;
    let packageName: string;

    if (user.subscription) {
        packagePrice = Number(user.subscription.price);
        packageName = user.subscription.planName;
    } else if (user.selectedPackageId) {
        const servicePackage = await prisma.servicePackage.findUnique({
            where: { id: user.selectedPackageId },
        });
        if (!servicePackage) {
            throw new Error('Service package not found');
        }
        packagePrice = servicePackage.price;
        packageName = servicePackage.name;
    } else {
        throw new Error('No package information found');
    }

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

    return await generateInvoice({
        userId,
        type: 'MONTHLY',
        category: 'FIRST_MONTH',
        amount: packagePrice,
        dueDate,
        promoCode,
    });
}

/**
 * Preview first month invoice details
 */
export async function previewFirstMonthInvoice(userId: string, paymentFlowId: string, promoCode?: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { subscription: true },
    });

    if (!user) {
        throw new Error('User not found');
    }

    const paymentFlow = await prisma.paymentFlow.findUnique({
        where: { id: paymentFlowId },
    });

    if (!paymentFlow) {
        throw new Error('PaymentFlow not found');
    }

    if (!paymentFlow.requiresFirstMonthPayment) {
        return null;
    }

    // Get package info
    let packagePrice: number;
    if (user.subscription) {
        packagePrice = Number(user.subscription.price);
    } else if (user.selectedPackageId) {
        const servicePackage = await prisma.servicePackage.findUnique({
            where: { id: user.selectedPackageId },
        });
        if (!servicePackage) {
            throw new Error('Service package not found');
        }
        packagePrice = servicePackage.price;
    } else {
        throw new Error('No package information found');
    }

    return await calculateInvoiceDetails({
        userId,
        type: 'MONTHLY',
        category: 'FIRST_MONTH',
        amount: packagePrice,
        dueDate: new Date(),
        promoCode,
    });
}

/**
 * Generate prepaid invoice
 */



