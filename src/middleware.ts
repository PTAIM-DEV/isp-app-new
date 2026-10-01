import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/session';

// Hardcoded paths to block (Honeypot)
const BLOCKED_PATHS = [
    '.php',
    'wp-admin',
    'wp-login',
    '.env',
    'composer.json',
    'package.json',
    'actuator',
    'autodiscover',
    'phpmyadmin',
    'sql',
    'backup',
    'dump',
];

// Simple in-memory rate limiter (For production, use Redis/KV)
const rateLimit = new Map<string, { count: number; lastReset: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 1000; // Increased to 1000 to handle Next.js RSC/Prefetch spam

function getIp(request: NextRequest) {
    return request.headers.get('x-forwarded-for') || 'unknown';
}

function checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = rateLimit.get(ip);

    if (!record) {
        rateLimit.set(ip, { count: 1, lastReset: now });
        return true;
    }

    if (now - record.lastReset > RATE_LIMIT_WINDOW) {
        rateLimit.set(ip, { count: 1, lastReset: now });
        return true;
    }

    if (record.count >= MAX_REQUESTS) {
        return false;
    }

    record.count++;
    return true;
}

export async function middleware(request: NextRequest) {
    const ip = getIp(request);
    const path = request.nextUrl.pathname;

    // 1. Rate Limiting
    if (!checkRateLimit(ip) && !path.startsWith('/_next')) {
        return new NextResponse(JSON.stringify({ error: 'Too Many Requests' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // 2. Honeypot/Security Check
    const isSuspicious = BLOCKED_PATHS.some(p => path.toLowerCase().includes(p));
    if (isSuspicious) {
        console.warn(`[SECURITY] Suspicious access attempt from ${ip} to ${path}`);
        return new NextResponse(JSON.stringify({ error: 'Forbidden', reason: 'Suspicious Activity Detected' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    // 3. Unified Authentication (Admin/Technician/Reseller)
    // We now use a unified session checking mechanism
    if (path.startsWith('/admin') || path.startsWith('/technician') || path.startsWith('/reseller')) {
        // Allow access to login pages and static assets
        if (
            path.includes('/login') ||
            path.startsWith('/_next') ||
            path.includes('.') ||
            path === '/admin/login' || // Handle explicit login paths
            path === '/technician/login' ||
            path === '/reseller-login'
        ) {
            return NextResponse.next();
        }

        const session = await getSession();

        if (!session) {
            const url = request.nextUrl.clone();
            // Redirect to appropriate login page based on path
            if (path.startsWith('/admin')) {
                url.pathname = '/admin/login';
            } else if (path.startsWith('/technician')) {
                url.pathname = '/technician/login';
            } else if (path.startsWith('/reseller')) {
                url.pathname = '/reseller-login';
            }
            return NextResponse.redirect(url);
        }

        // Role-Based Access Control (RBAC)
        // Check if user has permission to access the route
        const role = session.role;

        if (path.startsWith('/admin') && role !== 'ADMIN' && role !== 'FINANCE' && role !== 'NOC') {
            // Basic RBAC: Only Admin/Finance/NOC can enter /admin
            // We will refine granular access later
            // For now, if role is TECHNICIAN trying to access ADMIN, block?
            // Actually, technicans might have a separate portal, but sticking to existing paths:
            return new NextResponse('Forbidden: Insufficient Permissions', { status: 403 });
        }

        // Add more role checks here as we expand
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
};
