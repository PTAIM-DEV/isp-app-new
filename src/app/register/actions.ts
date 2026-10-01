'use server';

import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const RegisterSchema = z.object({
    name: z.string().min(3, 'Nama harus minimal 3 karakter'),
    phone: z.string().min(10, 'Nomor telepon tidak valid'),
    email: z.preprocess(
        (val) => {
            if (!val || val === '' || val === null) return null;
            return val;
        },
        z.union([
            z.string().email('Email tidak valid'),
            z.null()
        ]).optional()
    ),
    address: z.string().min(10, 'Alamat harus lengkap'),
    latitude: z.preprocess(
        (val) => {
            if (!val || val === '' || val === null) return null;
            const num = parseFloat(String(val));
            return isNaN(num) ? null : num;
        },
        z.number().nullable().optional()
    ),
    longitude: z.preprocess(
        (val) => {
            if (!val || val === '' || val === null) return null;
            const num = parseFloat(String(val));
            return isNaN(num) ? null : num;
        },
        z.number().nullable().optional()
    ),
    // Location fields
    provinceId: z.string().optional(),
    cityId: z.string().optional(),
    districtId: z.string().optional(),
    villageId: z.string().optional(),
    postalCode: z.string().length(5, 'Kode pos harus 5 digit').optional(),
    ktpImageUrl: z.preprocess(
        (val) => (val === '' || val === null ? null : val),
        z.string().nullable().optional()
    ),
    signatureData: z.preprocess(
        (val) => (val === '' || val === null ? null : val),
        z.string().nullable().optional()
    ),
    promoCode: z.preprocess(
        (val) => (val === '' || val === null ? null : val),
        z.string().nullable().optional()
    ),
});

export async function registerUser(formData: FormData) {
    const rawData = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        address: formData.get('address'),
        latitude: formData.get('latitude'),
        longitude: formData.get('longitude'),
        provinceId: formData.get('provinceId'),
        cityId: formData.get('cityId'),
        districtId: formData.get('districtId'),
        villageId: formData.get('villageId'),
        postalCode: formData.get('postalCode'),
        ktpImageUrl: formData.get('ktpImageUrl'),
        signatureData: formData.get('signatureData'),
        promoCode: formData.get('promoCode'),
    };

    const selectedPackageId = formData.get('selectedPackageId') as string | null;

    const validatedFields = RegisterSchema.safeParse(rawData);

    if (!validatedFields.success) {
        console.error('Validation Error:', JSON.stringify(validatedFields.error.issues, null, 2));

        const errorMessage = validatedFields.error.issues[0]?.message || 'Data yang dimasukkan tidak valid.';

        return {
            error: errorMessage,
            success: false
        };
    }

    const { name, phone, email, address, latitude, longitude, provinceId, cityId, districtId, villageId, postalCode, ktpImageUrl, signatureData, promoCode } = validatedFields.data;

    try {
        // Check if phone already exists
        const existingUser = await prisma.user.findUnique({
            where: { phone },
        });

        if (existingUser) {
            return {
                error: 'Nomor WhatsApp sudah terdaftar.',
                success: false
            };
        }

        // Validate promo code if provided
        if (promoCode) {
            const promo = await prisma.promo.findUnique({
                where: { code: promoCode.toUpperCase() },
            });

            if (!promo) {
                return {
                    error: `Kode promo "${promoCode}" tidak valid.`,
                    success: false
                };
            }

            if (!promo.isActive) {
                return {
                    error: `Kode promo "${promoCode}" sudah tidak aktif.`,
                    success: false
                };
            }

            // Check validity dates
            const now = new Date();
            if (promo.validFrom > now) {
                return {
                    error: `Kode promo "${promoCode}" belum berlaku.`,
                    success: false
                };
            }

            if (promo.validUntil && promo.validUntil < now) {
                return {
                    error: `Kode promo "${promoCode}" sudah kadaluarsa.`,
                    success: false
                };
            }

            // Check max uses
            if (promo.maxUses && promo.usedCount >= promo.maxUses) {
                return {
                    error: `Kode promo "${promoCode}" sudah mencapai batas penggunaan.`,
                    success: false
                };
            }
        }

        await prisma.user.create({
            data: {
                name,
                phone,
                email: email || null,
                address,
                latitude: latitude ?? null,
                longitude: longitude ?? null,
                provinceId: provinceId || null,
                cityId: cityId || null,
                districtId: districtId || null,
                villageId: villageId || null,
                postalCode: postalCode || null,
                selectedPackageId: selectedPackageId || null,
                ktpImageUrl: ktpImageUrl || null,
                signatureData: signatureData || null,
                registeredPromoCode: promoCode ? promoCode.toUpperCase() : null,
                role: 'LEAD',
                status: 'LEAD',
            },
        });

        return { success: true };
    } catch (error) {
        console.error('Registration error:', error);

        // Provide more specific error messages
        if (error instanceof Error) {
            // Handle Prisma unique constraint errors
            if (error.message.includes('Unique constraint')) {
                if (error.message.includes('phone')) {
                    return {
                        error: 'Nomor WhatsApp sudah terdaftar.',
                        success: false
                    };
                }
                if (error.message.includes('email')) {
                    return {
                        error: 'Email sudah terdaftar.',
                        success: false
                    };
                }
            }

            return {
                error: `Terjadi kesalahan: ${error.message}`,
                success: false
            };
        }

        return {
            error: 'Terjadi kesalahan saat mendaftar. Silakan coba lagi.',
            success: false
        };
    }
}
