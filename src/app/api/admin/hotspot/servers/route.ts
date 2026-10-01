import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { routerosService } from '@/lib/services/routeros-service';
import crypto from 'crypto';

/**
 * Check admin authentication
 */
async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  
  if (!session) {
    return false;
  }

  // Check against admin password in system settings
  const adminPass = await prisma.systemSetting.findUnique({
    where: { key: 'admin_password' }
  });
  
  if (!adminPass) {
    return false;
  }
  
  return session.value === adminPass.value;
}

/**
 * Encrypt password (same as RouterOSService)
 */
function encryptPassword(password: string): string {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const ALGORITHM = 'aes-256-cbc';
  
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32),
    iv
  );
  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * GET /api/admin/hotspot/servers
 * Get all MikroTik servers
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const servers = await prisma.mikrotikServer.findMany({
      include: {
        subscription: {
          include: {
            tier: true
          }
        },
        _count: {
          select: {
            vouchers: true,
            users: true,
            sessions: true,
            packages: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ servers });
  } catch (error: any) {
    console.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/hotspot/servers
 * Create new MikroTik server
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      host,
      port,
      username,
      password,
      useSSL,
      timeout,
      hotspotProfile,
      hotspotInterface,
      subscriptionId
    } = body;

    // Validate required fields
    if (!name || !host || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: name, host, username, password' },
        { status: 400 }
      );
    }

    // Test connection first
    const connectionTest = await routerosService.testConnection({
      host,
      port: port || 8728,
      username,
      password,
      useSSL: useSSL || false,
      timeout: timeout || 5000
    });

    if (!connectionTest) {
      return NextResponse.json(
        { error: 'Failed to connect to MikroTik server. Please check your credentials.' },
        { status: 400 }
      );
    }

    // Encrypt password before saving
    const encryptedPassword = encryptPassword(password);

    // Create server
    const server = await prisma.mikrotikServer.create({
      data: {
        name,
        description,
        host,
        port: port || 8728,
        username,
        password: encryptedPassword,
        useSSL: useSSL || false,
        timeout: timeout || 5000,
        hotspotProfile,
        hotspotInterface,
        subscriptionId: subscriptionId || null,
        connectionStatus: 'CONNECTED',
        lastConnected: new Date()
      },
      include: {
        subscription: {
          include: {
            tier: true
          }
        }
      }
    });

    return NextResponse.json({ server }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating server:', error);
    return NextResponse.json(
      { error: 'Failed to create server', details: error.message },
      { status: 500 }
    );
  }
}

