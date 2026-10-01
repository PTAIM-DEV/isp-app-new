import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { message, senderPhone } = body;

        if (!message || !senderPhone) {
            return NextResponse.json({ error: 'Message and senderPhone are required' }, { status: 400 });
        }

        // Simple parsing logic
        // Expected format: "Nama: [Name], Alamat: [Address], Paket: [Package]"

        const nameMatch = message.match(/(?:nama|name)\s*[:=]\s*([^\n,]+)/i);
        const addressMatch = message.match(/(?:alamat|address|lokasi)\s*[:=]\s*([^\n,]+)/i);
        const packageMatch = message.match(/(?:paket|package|layanan)\s*[:=]\s*([^\n,]+)/i);
        const emailMatch = message.match(/(?:email)\s*[:=]\s*([^\n,]+)/i);

        const extractedData = {
            name: nameMatch ? nameMatch[1].trim() : null,
            address: addressMatch ? addressMatch[1].trim() : null,
            packageName: packageMatch ? packageMatch[1].trim() : null,
            email: emailMatch ? emailMatch[1].trim() : null,
            phone: senderPhone
        };

        const missingFields: string[] = [];
        if (!extractedData.name) missingFields.push('Nama');
        if (!extractedData.address) missingFields.push('Alamat');
        if (!extractedData.packageName) missingFields.push('Paket Internet');

        if (missingFields.length > 0) {
            return NextResponse.json({
                status: 'INCOMPLETE',
                message: `Mohon lengkapi data berikut: ${missingFields.join(', ')}. Contoh: "Nama: Budi, Alamat: Jl. Mawar No 1, Paket: 50 Mbps"`,
                missingFields,
                extractedData
            });
        }

        // Find package
        let selectedPackageId: string | null = null;
        if (extractedData.packageName) {
            const pkg = await prisma.servicePackage.findFirst({
                where: {
                    OR: [
                        { name: { contains: extractedData.packageName, mode: 'insensitive' } },
                        { speed: { contains: extractedData.packageName, mode: 'insensitive' } }
                    ],
                    isActive: true
                }
            });
            if (pkg) selectedPackageId = pkg.id;
        }

        if (!selectedPackageId) {
            return NextResponse.json({
                status: 'INCOMPLETE',
                message: `Paket "${extractedData.packageName}" tidak ditemukan. Paket tersedia: 10 Mbps, 20 Mbps, 50 Mbps, 100 Mbps.`,
                missingFields: ['Valid Package'],
                extractedData
            });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { phone: senderPhone }
        });

        if (existingUser) {
            return NextResponse.json({
                status: 'EXISTS',
                message: 'Nomor HP ini sudah terdaftar.',
                user: { id: existingUser.id, name: existingUser.name }
            });
        }

        // Create Lead
        const user = await prisma.user.create({
            data: {
                name: extractedData.name!,
                phone: senderPhone,
                email: extractedData.email,
                address: extractedData.address,
                selectedPackageId,
                role: 'LEAD',
                status: 'LEAD',
            }
        });

        return NextResponse.json({
            status: 'SUCCESS',
            message: `Terima kasih ${user.name}, registrasi berhasil! Tim kami akan segera menghubungi Anda untuk jadwal instalasi.`,
            user: { id: user.id, name: user.name }
        });

    } catch (error) {
        console.error('Chat registration error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
