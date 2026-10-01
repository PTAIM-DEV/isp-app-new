'use server';

import { prisma } from '@/lib/prisma';
import { createSession } from '@/lib/session';
import { verifyPassword, hashPassword } from '@/lib/password';

const DEFAULT_USER = 'ispapp';
// Ideally we don't store plain default pass here, but for fallback:
const DEFAULT_PASS_HASH = '$2a$10$xXxX...'; // We can't easily put a hash here without generating it. 
// For this migration phase, we will check against the raw string if DB is empty, then Create a hash in DB.
const DEFAULT_PASS_RAW = 'QPWOEI102938';

export async function loginAdmin(username: string, password: string) {
    try {
        // --- 1. Check SystemSetting (Super Admin) ---
        // Get credentials from DB or set defaults
        let dbUser = await prisma.systemSetting.findUnique({ where: { key: 'admin_username' } });
        let dbPass = await prisma.systemSetting.findUnique({ where: { key: 'admin_password' } });

        // Initialize Defaults if missing
        if (!dbUser) {
            dbUser = await prisma.systemSetting.create({
                data: { key: 'admin_username', value: DEFAULT_USER, description: 'Admin Username' }
            });
        }

        if (!dbPass) {
            // Hash the default password before storing
            const hashedDefault = await hashPassword(DEFAULT_PASS_RAW);
            dbPass = await prisma.systemSetting.create({
                data: { key: 'admin_password', value: hashedDefault, description: 'Admin Password (Hashed)' }
            });
        }

        // Check if username matches Super Admin
        if (username === dbUser.value) {
            // Check if DB password is legacy plain text (migration support) or hashed
            const isLegacy = !dbPass.value.startsWith('$2a$'); // basic check for bcrypt
            let isValid = false;

            if (isLegacy) {
                if (password === dbPass.value) {
                    // Determine it's valid, and Ideally UPGRADE to hash immediately
                    const newHash = await hashPassword(password);
                    await prisma.systemSetting.update({
                        where: { key: 'admin_password' },
                        data: { value: newHash }
                    });
                    isValid = true;
                }
            } else {
                isValid = await verifyPassword(password, dbPass.value);
            }

            if (isValid) {
                await createSession({
                    sub: 'admin-legacy-id',
                    role: 'ADMIN',
                    name: 'Administrator'
                });
                return { success: true };
            }
        }

        // --- 2. Check User Table (Admin Role) ---
        // Allow login by Username (matching Name? Not unique/safe), Email, or Phone
        // Note: `username` param here acts as identifier
        const user = await prisma.user.findFirst({
            where: {
                role: 'ADMIN',
                status: 'ACTIVE',
                deletedAt: null,
                OR: [
                    { email: username },       // Login by Email
                    { phone: username },       // Login by Phone
                    { name: username }         // Login by Name (Fallback, but use with caution)
                ]
            }
        });

        if (user && user.password) {
            const isValid = await verifyPassword(password, user.password);
            if (isValid) {
                await createSession({
                    sub: user.id,
                    role: 'ADMIN', // Explicitly use ADMIN role from User
                    name: user.name
                });
                return { success: true };
            }
        }

        return { success: false, error: 'Invalid username, email, phone or password' };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Login failed due to system error' };
    }
}
