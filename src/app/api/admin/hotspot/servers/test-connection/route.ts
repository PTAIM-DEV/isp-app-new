import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { routerosService } from '@/lib/services/routeros-service';

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

/**
 * POST /api/admin/hotspot/servers/test-connection
 * Test connection to MikroTik server (without saving)
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication first
    const isAuthenticated = await checkAdminAuth();
    if (!isAuthenticated) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Unauthorized - Please login as admin',
          logs: [`[${new Date().toISOString()}] ✗ Authentication failed`]
        }, 
        { status: 401 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid request body',
          logs: [`[${new Date().toISOString()}] ✗ Invalid JSON in request body`]
        },
        { status: 400 }
      );
    }
    const { host, port, username, password, useSSL, timeout } = body;

    if (!host || !username || !password) {
      return NextResponse.json(
        { error: 'Missing required fields: host, username, password' },
        { status: 400 }
      );
    }

    const result = await routerosService.testConnection({
      host,
      port: port || 8728,
      username,
      password,
      useSSL: useSSL || false,
      timeout: timeout || 5000
    });

    return NextResponse.json({ 
      success: result.success,
      message: result.success ? 'Connection successful' : 'Connection failed',
      logs: result.logs,
      error: result.error,
      serverIdentity: result.serverIdentity
    });
  } catch (error: any) {
    console.error('Error testing connection:', error);
    
    // Ensure we always return JSON
    const errorMessage = error.message || 'Failed to test connection';
    const errorLogs = [
      `[${new Date().toISOString()}] ✗ Error: ${errorMessage}`,
      `[${new Date().toISOString()}] Error type: ${error.constructor?.name || 'Unknown'}`,
      `[${new Date().toISOString()}] Network request failed`
    ];

    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        logs: errorLogs
      },
      { status: 500 }
    );
  }
}


