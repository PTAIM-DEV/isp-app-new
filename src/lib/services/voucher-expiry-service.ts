import { PrismaClient } from '@prisma/client';
import { routerosService } from './routeros-service';

const prisma = new PrismaClient();

/**
 * Voucher Expiry Service
 * Handle expired voucher: logout user aktif dan disable voucher di MikroTik
 */
export class VoucherExpiryService {
  /**
   * Expire voucher: logout user aktif dan disable voucher di MikroTik
   */
  async expireVoucher(voucherId: string): Promise<{
    success: boolean;
    loggedOut: boolean;
    disabled: boolean;
    error?: string;
  }> {
    try {
      const voucher = await prisma.hotspotVoucher.findUnique({
        where: { id: voucherId },
        include: { server: true }
      });

      if (!voucher) {
        return {
          success: false,
          loggedOut: false,
          disabled: false,
          error: 'Voucher not found'
        };
      }

      if (!voucher.syncedToMikrotik || !voucher.username) {
        // Voucher belum di-sync atau tidak punya username, langsung update status
        await prisma.hotspotVoucher.update({
          where: { id: voucherId },
          data: { status: 'EXPIRED' }
        });
        return {
          success: true,
          loggedOut: false,
          disabled: false
        };
      }

      const username = voucher.username || voucher.code;
      let loggedOut = false;
      let disabled = false;

      try {
        // 1. Logout user aktif (disconnect active sessions)
        const activeSessions = await routerosService.getActiveSessions(voucher.serverId);
        const userSessions = activeSessions.filter(
          (session: any) => (session.user || session['name']) === username
        );

        for (const session of userSessions) {
          try {
            await routerosService.disconnectSession(voucher.serverId, session['.id']);
            loggedOut = true;
            console.log(`[EXPIRE VOUCHER] Logged out session ${session['.id']} for user ${username}`);
          } catch (error: any) {
            console.error(`[EXPIRE VOUCHER] Error disconnecting session ${session['.id']}:`, error.message);
          }
        }

        // 2. Disable user di MikroTik (atau remove jika prefer)
        try {
          await routerosService.updateHotspotUser(voucher.serverId, username, {
            disabled: true
          });
          disabled = true;
          console.log(`[EXPIRE VOUCHER] Disabled user ${username} in MikroTik`);
        } catch (error: any) {
          console.error(`[EXPIRE VOUCHER] Error disabling user ${username}:`, error.message);
          // Jika disable gagal, coba remove user
          try {
            await routerosService.removeHotspotUser(voucher.serverId, username, true);
            disabled = true;
            console.log(`[EXPIRE VOUCHER] Removed user ${username} from MikroTik`);
          } catch (removeError: any) {
            console.error(`[EXPIRE VOUCHER] Error removing user ${username}:`, removeError.message);
          }
        }
      } catch (mikrotikError: any) {
        console.error(`[EXPIRE VOUCHER] Error accessing MikroTik for voucher ${voucher.code}:`, mikrotikError.message);
        // Continue to update database even if MikroTik operation fails
      }

      // 3. Update status voucher di database
      await prisma.hotspotVoucher.update({
        where: { id: voucherId },
        data: { status: 'EXPIRED' }
      });

      return {
        success: true,
        loggedOut,
        disabled
      };
    } catch (error: any) {
      console.error(`[EXPIRE VOUCHER] Error expiring voucher ${voucherId}:`, error);
      return {
        success: false,
        loggedOut: false,
        disabled: false,
        error: error.message
      };
    }
  }

  /**
   * Check dan expire vouchers yang sudah expired
   * Dipanggil oleh cron job setiap menit
   */
  async checkAndExpireVouchers(): Promise<{
    checked: number;
    expired: number;
    errors: number;
  }> {
    const now = new Date();
    let checked = 0;
    let expired = 0;
    let errors = 0;

    try {
      // Find vouchers yang sudah expired tapi masih ACTIVE atau UNUSED
      const expiredVouchers = await prisma.hotspotVoucher.findMany({
        where: {
          expiresAt: {
            lte: now // expiresAt <= now
          },
          status: {
            in: ['ACTIVE', 'UNUSED'] // Hanya expire yang masih aktif atau belum digunakan
          },
          syncedToMikrotik: true // Hanya yang sudah di-sync
        },
        include: {
          server: {
            select: {
              id: true,
              name: true,
              connectionStatus: true
            }
          }
        }
      });

      checked = expiredVouchers.length;
      console.log(`[EXPIRE VOUCHER] Found ${checked} expired vouchers to process`);

      // Process each expired voucher
      for (const voucher of expiredVouchers) {
        try {
          // Skip jika server tidak connected
          if (voucher.server.connectionStatus !== 'CONNECTED') {
            console.warn(`[EXPIRE VOUCHER] Skipping voucher ${voucher.code} - server ${voucher.server.name} is not connected`);
            // Update status anyway
            await prisma.hotspotVoucher.update({
              where: { id: voucher.id },
              data: { status: 'EXPIRED' }
            });
            expired++;
            continue;
          }

          const result = await this.expireVoucher(voucher.id);
          if (result.success) {
            expired++;
            console.log(`[EXPIRE VOUCHER] Successfully expired voucher ${voucher.code}`);
          } else {
            errors++;
            console.error(`[EXPIRE VOUCHER] Failed to expire voucher ${voucher.code}:`, result.error);
          }
        } catch (error: any) {
          errors++;
          console.error(`[EXPIRE VOUCHER] Error processing voucher ${voucher.code}:`, error.message);
        }
      }

      return { checked, expired, errors };
    } catch (error: any) {
      console.error('[EXPIRE VOUCHER] Error checking expired vouchers:', error);
      return { checked, expired, errors: errors + 1 };
    }
  }
}

// Singleton instance
export const voucherExpiryService = new VoucherExpiryService();





