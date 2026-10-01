'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function saveTechnician(formData: FormData, id?: string) {
    const name = formData.get('name') as string;
    const phone = formData.get('phone') as string;
    const email = formData.get('email') as string || null;
    const status = formData.get('status') as string;
    const password = formData.get('password') as string;
    const passwordConfirm = formData.get('passwordConfirm') as string;
    const assignedProvinces = formData.getAll('assignedProvinces') as string[];
    const assignedCities = formData.getAll('assignedCities') as string[];
    const skills = formData.getAll('skills') as string[];
    const photoUrlInput = formData.get('photoUrl') as string;
    const photoUrl = photoUrlInput && photoUrlInput.trim() !== '' ? photoUrlInput : null;
    const joinDate = formData.get('joinDate') as string;

    try {
        // Validate password if creating new or changing password
        if (!id || password) {
            if (!password || password.length < 6) {
                return { success: false, error: 'Password minimal 6 karakter.' };
            }
            if (password !== passwordConfirm) {
                return { success: false, error: 'Password tidak cocok.' };
            }
        }

        // Hash password if provided
        let hashedPassword: string | undefined;
        if (password) {
            hashedPassword = await bcrypt.hash(password, 10);
        }

        const data: any = {
            name,
            phone: phone.replace(/\D/g, ''), // Sanitize phone number to digits only
            email: email || null,
            status,
            assignedProvinces: assignedProvinces.filter(p => p),
            assignedCities: assignedCities.filter(c => c),
            skills: skills.filter(s => s),
            photoUrl: photoUrl || null,
        };

        if (hashedPassword) {
            data.password = hashedPassword;
        }

        if (joinDate) {
            data.joinDate = new Date(joinDate);
        }

        if (id) {
            await prisma.user.update({
                where: { id },
                data,
            });
        } else {
            await prisma.user.create({
                data: {
                    ...data,
                    role: 'TECHNICIAN',
                },
            });
        }

        revalidatePath('/admin/technicians');
        return { success: true };
    } catch (error: any) {
        console.error('Save technician error:', error);
        if (error.code === 'P2002') {
            if (error.meta?.target?.includes('phone')) {
                return { success: false, error: 'Nomor telepon sudah digunakan.' };
            }
            if (error.meta?.target?.includes('email')) {
                return { success: false, error: 'Email sudah digunakan.' };
            }
        }
        return { success: false, error: 'Gagal menyimpan data teknisi.' };
    }
}
