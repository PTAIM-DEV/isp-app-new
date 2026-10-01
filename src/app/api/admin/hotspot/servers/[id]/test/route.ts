import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { routerosService } from '@/lib/services/routeros-service';
import crypto from 'crypto';

async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  if (!session) return false;
  const adminPass = await prisma.systemSetting.findUnique({
    where: { key: 'admin_password' }
  });
  if (!adminPass) { return false; }
  return session.value === adminPass.value;
}

function decryptPassword(encryptedPassword: string): string {
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

/**
 * POST /api/admin/hotspot/servers/[id]/test
 * Test connection to MikroTik server
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const server = await prisma.mikrotikServer.findUnique({
      where: { id }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Use provided credentials or existing ones
    const config = {
      host: body.host || server.host,
      port: body.port || server.port,
      username: body.username || server.username,
      password: body.password || decryptPassword(server.password),
      useSSL: body.useSSL !== undefined ? body.useSSL : server.useSSL,
      timeout: body.timeout || server.timeout
    };

    const isConnected = await routerosService.testConnection(config);

    if (isConnected) {
      // Update connection status
      await prisma.mikrotikServer.update({
        where: { id },
        data: {
          connectionStatus: 'CONNECTED',
          lastConnected: new Date(),
          errorMessage: null
        }
      });
    } else {
      await prisma.mikrotikServer.update({
        where: { id },
        data: {
          connectionStatus: 'ERROR',
          errorMessage: 'Connection test failed'
        }
      });
    }

    return NextResponse.json({ 
      success: isConnected,
      message: isConnected ? 'Connection successful' : 'Connection failed'
    });
  } catch (error: any) {
    console.error('Error testing connection:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to test connection', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}


