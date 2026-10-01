import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { hotspotVoucherService } from '@/lib/services/hotspot-voucher-service';

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

// Increase timeout untuk route ini (40 detik untuk profile creation)
export const maxDuration = 40;

/**
 * POST /api/admin/hotspot/vouchers/[id]/sync
 * Sync voucher to MikroTik manually
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();
  console.log(`[SYNC VOUCHER] Starting sync for voucher ${await params.then(p => p.id)}`);
  
  try {
    if (!(await checkAdminAuth())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id },
      include: { server: true, package: true }
    });

    if (!voucher) {
      return NextResponse.json({ error: 'Voucher not found' }, { status: 404 });
    }

    console.log(`[SYNC VOUCHER] Voucher found: ${voucher.code}, server: ${voucher.server.name}, package: ${voucher.package?.name || 'none'}`);

    if (voucher.syncedToMikrotik) {
      console.log(`[SYNC VOUCHER] Voucher ${voucher.code} already synced, skipping`);
      return NextResponse.json({ 
        success: true,
        message: 'Voucher already synced to MikroTik',
        voucher: voucher
      });
    }

    // Sync voucher to MikroTik dengan timeout handling
    try {
      console.log(`[SYNC VOUCHER] Starting sync operation for ${voucher.code}...`);
      const syncPromise = hotspotVoucherService.syncVoucherToMikrotik(id);
      // Increase timeout karena profile creation mungkin memakan waktu (40 detik)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Sync operation timeout after 40 seconds')), 40000)
      );

      await Promise.race([syncPromise, timeoutPromise]);
      
      const syncTime = Date.now() - startTime;
      console.log(`[SYNC VOUCHER] Sync completed successfully in ${syncTime}ms`);

      // Get updated voucher
      const updatedVoucher = await prisma.hotspotVoucher.findUnique({
        where: { id },
        include: { server: true, package: true }
      });

      return NextResponse.json({ 
        success: true,
        message: 'Voucher synced to MikroTik successfully',
        voucher: updatedVoucher
      });
    } catch (syncError: any) {
      const elapsed = Date.now() - startTime;
      console.error(`[SYNC VOUCHER] Sync error after ${elapsed}ms:`, {
        error: syncError.message,
        stack: syncError.stack,
        voucherCode: voucher.code,
        serverId: voucher.serverId
      });
      
      // Check if it's a timeout error
      if (syncError.message && syncError.message.includes('timeout')) {
        return NextResponse.json(
          { 
            success: false,
            error: 'Sync timeout: Operation took too long. Profile creation atau koneksi ke MikroTik mungkin lambat. Silakan coba lagi atau periksa status server.',
            details: syncError.message,
            elapsed: elapsed
          },
          { status: 504 }
        );
      }
      throw syncError; // Re-throw untuk di-handle di catch block utama
    }
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`[SYNC VOUCHER] Error syncing voucher (${elapsed}ms):`, {
      error: error.message,
      stack: error.stack,
      voucherId: await params.then(p => p.id)
    });
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to sync voucher to MikroTik', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

