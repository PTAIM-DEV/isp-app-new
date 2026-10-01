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

  const adminPass = await prisma.systemSetting.findUnique({
    where: { key: 'admin_password' }
  });

  if (!adminPass) { return false; }
  return session.value === adminPass.value;
}

/**
 * Encrypt password
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
 * GET /api/admin/hotspot/servers/[id]
 * Get server details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const server = await prisma.mikrotikServer.findUnique({
      where: { id },
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
      }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    return NextResponse.json({ server });
  } catch (error: any) {
    console.error('Error fetching server:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/hotspot/servers/[id]
 * Update server
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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

    // Get existing server
    const existingServer = await prisma.mikrotikServer.findUnique({
      where: { id }
    });

    if (!existingServer) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // If password is provided, encrypt it
    let encryptedPassword = existingServer.password;
    if (password) {
      encryptedPassword = encryptPassword(password);
    }

    // Test connection if connection details changed
    if (host || port || username || password) {
      const connectionTest = await routerosService.testConnection({
        host: host || existingServer.host,
        port: port || existingServer.port,
        username: username || existingServer.username,
        password: password || (await decryptPassword(existingServer.password)),
        useSSL: useSSL !== undefined ? useSSL : existingServer.useSSL,
        timeout: timeout || existingServer.timeout
      });

      if (!connectionTest) {
        return NextResponse.json(
          { error: 'Failed to connect to MikroTik server. Please check your credentials.' },
          { status: 400 }
        );
      }
    }

    // Update server
    const server = await prisma.mikrotikServer.update({
      where: { id },
      data: {
        name: name || undefined,
        description: description !== undefined ? description : undefined,
        host: host || undefined,
        port: port || undefined,
        username: username || undefined,
        password: password ? encryptedPassword : undefined,
        useSSL: useSSL !== undefined ? useSSL : undefined,
        timeout: timeout || undefined,
        hotspotProfile: hotspotProfile !== undefined ? hotspotProfile : undefined,
        hotspotInterface: hotspotInterface !== undefined ? hotspotInterface : undefined,
        subscriptionId: subscriptionId !== undefined ? subscriptionId : undefined,
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

    return NextResponse.json({ server });
  } catch (error: any) {
    console.error('Error updating server:', error);
    return NextResponse.json(
      { error: 'Failed to update server', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/hotspot/servers/[id]
 * Delete server
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if server has vouchers or packages
    const server = await prisma.mikrotikServer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vouchers: true,
            packages: true,
            users: true,
            sessions: true
          }
        }
      }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    if (server._count.vouchers > 0 || server._count.packages > 0) {
      return NextResponse.json(
        { error: 'Cannot delete server with existing vouchers or packages. Please delete them first.' },
        { status: 400 }
      );
    }

    // Disconnect from RouterOS if connected
    try {
      await routerosService.disconnect(id);
    } catch (error) {
      // Ignore disconnect errors
    }

    // Delete server
    await prisma.mikrotikServer.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting server:', error);
    return NextResponse.json(
      { error: 'Failed to delete server', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to decrypt password (should match RouterOSService)
async function decryptPassword(encryptedPassword: string): Promise<string> {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  const ALGORITHM = 'aes-256-cbc';
  
  const parts = encryptedPassword.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32),
    iv
  );
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}


