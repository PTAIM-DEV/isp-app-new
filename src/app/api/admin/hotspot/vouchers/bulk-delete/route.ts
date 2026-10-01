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
 * POST /api/admin/hotspot/vouchers/bulk-delete
 * Delete multiple vouchers
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: ids must be a non-empty array' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    console.log(`[BULK DELETE] Starting bulk delete for ${ids.length} vouchers`);

    // Get vouchers with their counts and server info
    const vouchers = await prisma.hotspotVoucher.findMany({
      where: { id: { in: ids } },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            connectionStatus: true,
            timeout: true,
            host: true
          }
        },
        _count: {
          select: {
            sessions: true,
            sales: true
          }
        }
      }
    });

    const { routerosService } = await import('@/lib/services/routeros-service');
    let deletedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    // Delete each voucher
    for (const voucher of vouchers) {
      const voucherStartTime = Date.now();
      console.log(`[BULK DELETE] Processing voucher ${voucher.code} (${voucher.id})`);
      
      try {
        // Check if voucher has active sessions or sales
        if (voucher._count.sessions > 0 || voucher._count.sales > 0) {
          failedCount++;
          errors.push(`Voucher ${voucher.code}: memiliki sesi aktif atau penjualan`);
          console.log(`[BULK DELETE] Skipping voucher ${voucher.code}: has sessions or sales`);
          continue;
        }

        // Check and remove from MikroTik if synced
        if (voucher.syncedToMikrotik && voucher.username) {
          try {
            const server = voucher.server;
            console.log(`[BULK DELETE] Voucher ${voucher.code} synced to MikroTik, server: ${server.name}, status: ${server.connectionStatus}`);

            if (server.connectionStatus === 'CONNECTED') {
              // Add timeout wrapper untuk prevent 504
              const timeoutMs = (server.timeout || 5000) + 2000; // Add 2s buffer
              console.log(`[BULK DELETE] Checking user existence for ${voucher.code} with timeout: ${timeoutMs}ms`);
              
              try {
                // Check if user exists in MikroTik with timeout
                // Skip connection test untuk faster operation (trust existing connection)
                const checkPromise = routerosService.getHotspotUser(voucher.serverId, voucher.username, true);
                const timeoutPromise = new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('MikroTik check timeout')), timeoutMs)
                );
                
                const userExists = await Promise.race([checkPromise, timeoutPromise]) as any;
                const checkTime = Date.now() - voucherStartTime;
                console.log(`[BULK DELETE] User check for ${voucher.code} completed in ${checkTime}ms, exists: ${!!userExists}`);
                
                if (userExists) {
                  console.log(`[BULK DELETE] User exists, removing ${voucher.code} from MikroTik...`);
                  // User exists, remove from MikroTik first
                  // Skip connection test untuk faster operation
                  const removePromise = routerosService.removeHotspotUser(voucher.serverId, voucher.username, true);
                  const removeTimeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('MikroTik remove timeout')), timeoutMs)
                  );
                  
                  await Promise.race([removePromise, removeTimeoutPromise]);
                  const removeTime = Date.now() - voucherStartTime;
                  console.log(`[BULK DELETE] User ${voucher.code} removed from MikroTik in ${removeTime}ms`);
                } else {
                  console.log(`[BULK DELETE] User ${voucher.code} not found in MikroTik, already deleted manually`);
                }
              } catch (timeoutError: any) {
                const elapsed = Date.now() - voucherStartTime;
                console.error(`[BULK DELETE] Timeout or error during MikroTik check for ${voucher.code} (${elapsed}ms):`, {
                  error: timeoutError.message,
                  server: server.name,
                  host: server.host
                });
                // Continue with deletion even if timeout - server might be slow/unreachable
                // Log warning but don't fail the deletion
              }
            } else {
              // Server offline or error
              console.warn(`[BULK DELETE] Server ${server.name} is ${server.connectionStatus}. Deleting voucher ${voucher.code} from database only.`);
            }
          } catch (error: any) {
            const elapsed = Date.now() - voucherStartTime;
            console.error(`[BULK DELETE] Error checking/removing voucher ${voucher.code} from MikroTik (${elapsed}ms):`, {
              error: error.message,
              stack: error.stack,
              voucherCode: voucher.code,
              username: voucher.username,
              serverId: voucher.serverId
            });
            // Continue with deletion even if MikroTik check/removal fails
            // This handles cases where server is unreachable
          }
        } else {
          console.log(`[BULK DELETE] Voucher ${voucher.code} not synced to MikroTik, skipping check`);
        }

        // Delete voucher from database
        await prisma.hotspotVoucher.delete({
          where: { id: voucher.id }
        });

        const totalTime = Date.now() - voucherStartTime;
        console.log(`[BULK DELETE] Voucher ${voucher.code} deleted successfully in ${totalTime}ms`);
        deletedCount++;
      } catch (error: any) {
        const elapsed = Date.now() - voucherStartTime;
        failedCount++;
        const errorMsg = error.message || 'Unknown error';
        errors.push(`Voucher ${voucher.code}: ${errorMsg}`);
        console.error(`[BULK DELETE] Error deleting voucher ${voucher.code} (${elapsed}ms):`, {
          error: errorMsg,
          stack: error.stack,
          voucherId: voucher.id
        });
      }
    }

    const totalTime = Date.now() - startTime;
    console.log(`[BULK DELETE] Completed: ${deletedCount} deleted, ${failedCount} failed, total time: ${totalTime}ms`);

    return NextResponse.json({
      success: true,
      deletedCount,
      failedCount,
      total: ids.length,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json(
      { error: 'Failed to delete vouchers', details: error.message },
      { status: 500 }
    );
  }
}

