import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

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
 * GET /api/admin/hotspot/vouchers/[id]
 * Get voucher details
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

    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id },
      include: {
        server: true,
        package: true,
        resellerUser: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        sessions: {
          orderBy: {
            startTime: 'desc'
          },
          take: 10
        },
        sales: {
          include: {
            resellerUser: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            sessions: true
          }
        }
      }
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    return NextResponse.json({ voucher });
  } catch (error: any) {
    console.error('Error fetching voucher:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voucher', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/hotspot/vouchers/[id]
 * Delete voucher
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

    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            sessions: true,
            sales: true
          }
        }
      }
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    // Check if voucher has active sessions or sales
    if (voucher._count.sessions > 0 || voucher._count.sales > 0) {
      return NextResponse.json(
        { error: 'Cannot delete voucher with existing sessions or sales' },
        { status: 400 }
      );
    }

    // Check and remove from MikroTik if synced
    if (voucher.syncedToMikrotik && voucher.username) {
      const startTime = Date.now();
      console.log(`[DELETE VOUCHER] Starting MikroTik check for voucher ${voucher.id}, username: ${voucher.username}`);
      
      try {
        const { routerosService } = await import('@/lib/services/routeros-service');
        
        // Check server connection status first
        const server = await prisma.mikrotikServer.findUnique({
          where: { id: voucher.serverId },
          select: { 
            connectionStatus: true, 
            name: true,
            host: true,
            timeout: true
          }
        });

        console.log(`[DELETE VOUCHER] Server status: ${server?.connectionStatus}, name: ${server?.name}`);

        if (server && server.connectionStatus === 'CONNECTED') {
          // Add timeout wrapper untuk prevent 504
          const timeoutMs = (server.timeout || 5000) + 2000; // Add 2s buffer
          console.log(`[DELETE VOUCHER] Checking user existence with timeout: ${timeoutMs}ms`);
          
              try {
                // Check if user exists in MikroTik with timeout
                // Skip connection test untuk faster operation (trust existing connection)
                const checkPromise = routerosService.getHotspotUser(voucher.serverId, voucher.username, true);
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('MikroTik check timeout')), timeoutMs)
                );
                
                const userExists = await Promise.race([checkPromise, timeoutPromise]) as any;
            const checkTime = Date.now() - startTime;
            console.log(`[DELETE VOUCHER] User check completed in ${checkTime}ms, exists: ${!!userExists}`);
            
                if (userExists) {
                  console.log(`[DELETE VOUCHER] User exists, removing from MikroTik...`);
                  // User exists, remove from MikroTik first
                  // Skip connection test untuk faster operation
                  const removePromise = routerosService.removeHotspotUser(voucher.serverId, voucher.username, true);
                  const removeTimeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('MikroTik remove timeout')), timeoutMs)
                  );
                  
                  await Promise.race([removePromise, removeTimeoutPromise]);
              const removeTime = Date.now() - startTime;
              console.log(`[DELETE VOUCHER] User removed from MikroTik in ${removeTime}ms`);
            } else {
              console.log(`[DELETE VOUCHER] User not found in MikroTik, already deleted manually`);
            }
            // If user doesn't exist in MikroTik, it was already deleted manually
            // Continue with database deletion
          } catch (timeoutError: any) {
            const elapsed = Date.now() - startTime;
            console.error(`[DELETE VOUCHER] Timeout or error during MikroTik check (${elapsed}ms):`, {
              error: timeoutError.message,
              stack: timeoutError.stack,
              server: server.name,
              host: server.host
            });
            // Continue with deletion even if timeout - server might be slow/unreachable
            // Log warning but don't fail the deletion
          }
        } else {
          // Server offline or error
          // Still allow deletion from database, but log warning
          console.warn(`[DELETE VOUCHER] Server ${server?.name || voucher.serverId} is ${server?.connectionStatus || 'UNKNOWN'}. Deleting voucher from database only.`);
        }
      } catch (error: any) {
        const elapsed = Date.now() - startTime;
        console.error(`[DELETE VOUCHER] Error checking/removing voucher from MikroTik (${elapsed}ms):`, {
          error: error.message,
          stack: error.stack,
          voucherId: voucher.id,
          username: voucher.username,
          serverId: voucher.serverId
        });
        // Continue with deletion even if MikroTik check/removal fails
        // This handles cases where server is unreachable
      }
    } else {
      console.log(`[DELETE VOUCHER] Voucher not synced to MikroTik, skipping check`);
    }

    // Delete voucher
    await prisma.hotspotVoucher.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting voucher:', error);
    return NextResponse.json(
      { error: 'Failed to delete voucher', details: error.message },
      { status: 500 }
    );
  }
}


