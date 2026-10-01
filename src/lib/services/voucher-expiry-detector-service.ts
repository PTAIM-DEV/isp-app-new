import { PrismaClient } from '@prisma/client';
import { routerosService } from './routeros-service';

const prisma = new PrismaClient();

/**
 * Parse MikroTik duration format ke detik (integer)
 * Format: "9m3s", "1h30m", "2d5h10m30s", dll
 */
function parseMikrotikDuration(duration: string | number | null | undefined): number {
  if (!duration) return 0;
  if (typeof duration === 'number') return duration;
  if (typeof duration !== 'string') return 0;

  const str = duration.trim();
  if (!str) return 0;

  const pattern = /(\d+)([dhms])/g;
  let totalSeconds = 0;
  let match;

  while ((match = pattern.exec(str)) !== null) {
    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'd':
        totalSeconds += value * 24 * 60 * 60;
        break;
      case 'h':
        totalSeconds += value * 60 * 60;
        break;
      case 'm':
        totalSeconds += value * 60;
        break;
      case 's':
        totalSeconds += value;
        break;
    }
  }

  return totalSeconds;
}

/**
 * Parse validity dari comment atau dari field validity
 * Format comment: "DD/MM/YYYY HH:MM" atau format lainnya
 * Format validity: "1d", "12h", dll (calendar window sejak first login)
 */
function parseValidity(validity: string | null | undefined, comment: string | null | undefined, activatedAt: Date): { isValid: boolean; expiryDate: Date | null } {
  // Check validity field first (calendar window sejak first login)
  if (validity) {
    const validitySeconds = parseMikrotikDuration(validity);
    if (validitySeconds > 0) {
      // Validity adalah calendar window sejak first login (activatedAt)
      // Contoh: validity=1d berarti 24 jam dari activatedAt
      const expiryDate = new Date(activatedAt.getTime() + validitySeconds * 1000);
      const now = new Date();
      return {
        isValid: now < expiryDate,
        expiryDate
      };
    }
  }

  // Check comment untuk format expiry date (format: "DD/MM/YYYY HH:MM")
  if (comment) {
    // Format: "DD/MM/YYYY HH:MM" (sesuai dengan format di hotspot-voucher-service.ts)
    const dateMatch = comment.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
    if (dateMatch) {
      const [, day, month, year, hour, minute] = dateMatch;
      const expiryDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute)
      );
      const now = new Date();
      return {
        isValid: now < expiryDate,
        expiryDate
      };
    }
  }

  // Jika tidak ada validity atau comment, anggap masih valid
  return { isValid: true, expiryDate: null };
}

/**
 * Voucher Expiry Detector Service
 * Mendeteksi expiry berdasarkan nilai Mikrotik (uptime, limit-uptime, validity)
 * ALWAYS menggunakan nilai Mikrotik sebagai primary truth, bukan local DB
 */
export class VoucherExpiryDetectorService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private loggedOfflineServers = new Set<string>();

  /**
   * Start scheduler yang berjalan setiap 5 detik
   */
  start(): void {
    if (this.isRunning) {
      console.log('[EXPIRY DETECTOR] Scheduler already running');
      return;
    }

    console.log('[EXPIRY DETECTOR] Starting scheduler (every 5 seconds)');
    this.isRunning = true;

    // Run immediately first time
    this.checkExpiredVouchers().catch(err => {
      console.error('[EXPIRY DETECTOR] Error in initial check:', err);
    });

    // Then run every 5 seconds
    this.intervalId = setInterval(() => {
      this.checkExpiredVouchers().catch(err => {
        console.error('[EXPIRY DETECTOR] Error in scheduled check:', err);
      });
    }, 5000);
  }

  /**
   * Stop scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[EXPIRY DETECTOR] Scheduler stopped');
  }

  /**
   * Check expired vouchers berdasarkan nilai Mikrotik
   */
  async checkExpiredVouchers(): Promise<{
    checked: number;
    updated: number;
    disabled: number;
    errors: number;
  }> {
    const startTime = Date.now();
    let checked = 0;
    let updated = 0;
    let disabled = 0;
    let errors = 0;

    try {
      // Fetch hanya vouchers dengan status UNUSED atau ACTIVE
      const vouchers = await prisma.hotspotVoucher.findMany({
        where: {
          status: {
            in: ['UNUSED', 'ACTIVE']
          },
          syncedToMikrotik: true // Hanya yang sudah di-sync ke Mikrotik
        },
        include: {
          server: {
            select: {
              id: true,
              name: true,
              connectionStatus: true,
              isActive: true
            }
          }
        }
      });

      checked = vouchers.length;
      console.log(`[EXPIRY DETECTOR] Checking ${checked} vouchers (NEW/ACTIVE)`);

      // Process each voucher
      for (const voucher of vouchers) {
        try {
          // Skip jika server tidak aktif atau tidak connected
          if (!voucher.server.isActive || voucher.server.connectionStatus !== 'CONNECTED') {
            if (!this.loggedOfflineServers.has(voucher.server.id)) {
              console.warn(`[EXPIRY DETECTOR] Skipping vouchers for server ${voucher.server.name} - server is not active or connected`);
              this.loggedOfflineServers.add(voucher.server.id);
            }
            continue;
          } else {
            // If server is back online, remove from set so we log again if it goes offline
            if (this.loggedOfflineServers.has(voucher.server.id)) {
              this.loggedOfflineServers.delete(voucher.server.id);
              console.log(`[EXPIRY DETECTOR] Server ${voucher.server.name} is back online.`);
            }
          }

          const username = voucher.username || voucher.code;
          if (!username) {
            console.warn(`[EXPIRY DETECTOR] Skipping voucher ${voucher.code} - no username`);
            continue;
          }

          // Query Mikrotik untuk user detail
          const mikrotikUser = await routerosService.getHotspotUserDetail(
            voucher.serverId,
            username,
            true // Skip connection test untuk faster operation
          );

          if (!mikrotikUser) {
            console.warn(`[EXPIRY DETECTOR] User ${username} not found in Mikrotik for voucher ${voucher.code}`);
            continue;
          }

          // Extract values dari Mikrotik (primary truth)
          const uptime = mikrotikUser.uptime || '0s';
          const limitUptime = mikrotikUser['limit-uptime'] || null;
          const validity = mikrotikUser.validity || null;
          const comment = mikrotikUser.comment || null;
          const isDisabled = mikrotikUser.disabled === true || mikrotikUser.disabled === 'true';
          const lastLoggedOut = mikrotikUser['last-logged-out'] || null;
          const macCookieTimeout = mikrotikUser['mac-cookie-timeout'] || null;

          // Parse values
          const uptimeSeconds = parseMikrotikDuration(uptime);
          const limitUptimeSeconds = limitUptime ? parseMikrotikDuration(limitUptime) : null;

          // Get voucher createdAt untuk check validity window
          const voucherCreatedAt = voucher.createdAt;
          const voucherActivatedAt = voucher.activatedAt || voucherCreatedAt;

          // Apply logic untuk deteksi expiry (prioritas: EXPIRED > ACTIVE)
          let newStatus: string | null = null;
          let shouldDisable = false;

          // Check validity window first (calendar window sejak first login)
          const validityCheck = parseValidity(validity, comment, voucherActivatedAt);
          const isValidityExpired = !validityCheck.isValid && validityCheck.expiryDate;

          // Check limit-uptime
          const isLimitUptimeReached = limitUptimeSeconds !== null && uptimeSeconds >= limitUptimeSeconds;

          // Check unused > 30 days
          const daysSinceCreation = (Date.now() - voucherCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
          const isUnusedExpired = uptimeSeconds === 0 && daysSinceCreation > 30;

          // Prioritas: EXPIRED conditions > ACTIVE
          // Logic 2: IF uptime >= limit-uptime: status = EXPIRED, disable user
          if (isLimitUptimeReached) {
            newStatus = 'EXPIRED';
            shouldDisable = true;
            console.log(`[EXPIRY DETECTOR] Voucher ${voucher.code}: EXPIRED (uptime ${uptimeSeconds}s >= limit ${limitUptimeSeconds}s)`);
          }
          // Logic 3: IF validity window passed: status = EXPIRED, disable user
          else if (isValidityExpired) {
            newStatus = 'EXPIRED';
            shouldDisable = true;
            console.log(`[EXPIRY DETECTOR] Voucher ${voucher.code}: EXPIRED (validity window passed, expired at ${validityCheck.expiryDate})`);
          }
          // Logic 4: IF uptime = 0 AND CRT date older than 30 days: status = EXPIRED, disable user
          else if (isUnusedExpired) {
            newStatus = 'EXPIRED';
            shouldDisable = true;
            console.log(`[EXPIRY DETECTOR] Voucher ${voucher.code}: EXPIRED (uptime=0, created ${daysSinceCreation.toFixed(1)} days ago)`);
          }
          // Logic 1: IF uptime > 0 AND DB status=UNUSED: status = ACTIVE
          else if (uptimeSeconds > 0 && voucher.status === 'UNUSED') {
            newStatus = 'ACTIVE';
            console.log(`[EXPIRY DETECTOR] Voucher ${voucher.code}: UNUSED -> ACTIVE (uptime > 0)`);
          }

          // Logic 5: IF user disabled in Mikrotik: check reason and update status accordingly
          if (isDisabled) {
            // Jika user sudah disabled di Mikrotik, check apakah karena limit uptime atau alasan lain
            if (limitUptimeSeconds !== null && uptimeSeconds >= limitUptimeSeconds) {
              newStatus = 'EXPIRED';
              console.log(`[EXPIRY DETECTOR] Voucher ${voucher.code}: EXPIRED (user disabled, uptime >= limit-uptime)`);
            } else if (uptimeSeconds === 0 && (Date.now() - voucherCreatedAt.getTime()) / (1000 * 60 * 60 * 24) > 30) {
              newStatus = 'EXPIRED';
              console.log(`[EXPIRY DETECTOR] Voucher ${voucher.code}: EXPIRED (user disabled, uptime=0, >30 days)`);
            } else {
              // User disabled tapi belum expired, tetap update status jika ada perubahan
              if (voucher.status === 'ACTIVE' && uptimeSeconds === 0) {
                // User disabled dan tidak ada uptime, mungkin sudah logout
                // Tapi tidak expired, jadi tidak update status
                console.log(`[EXPIRY DETECTOR] Voucher ${voucher.code}: User disabled but not expired, keeping status ${voucher.status}`);
              }
            }
          }

          // Update status di database jika ada perubahan
          if (newStatus && newStatus !== voucher.status) {
            await prisma.hotspotVoucher.update({
              where: { id: voucher.id },
              data: {
                status: newStatus as any,
                ...(newStatus === 'ACTIVE' && !voucher.activatedAt && { activatedAt: new Date() })
              }
            });
            updated++;
            console.log(`[EXPIRY DETECTOR] Updated voucher ${voucher.code} status: ${voucher.status} -> ${newStatus}`);
          }

          // Disable user di Mikrotik jika expired
          if (shouldDisable && !isDisabled) {
            try {
              await routerosService.updateHotspotUser(voucher.serverId, username, {
                disabled: true
              });
              disabled++;
              console.log(`[EXPIRY DETECTOR] Disabled user ${username} in Mikrotik for voucher ${voucher.code}`);
            } catch (disableError: any) {
              console.error(`[EXPIRY DETECTOR] Error disabling user ${username} in Mikrotik:`, disableError.message);
              errors++;
            }
          }

        } catch (error: any) {
          errors++;
          console.error(`[EXPIRY DETECTOR] Error processing voucher ${voucher.code}:`, error.message);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[EXPIRY DETECTOR] Check completed: ${checked} checked, ${updated} updated, ${disabled} disabled, ${errors} errors (${duration}ms)`);

      return { checked, updated, disabled, errors };
    } catch (error: any) {
      console.error('[EXPIRY DETECTOR] Error checking expired vouchers:', error);
      return { checked, updated, disabled, errors: errors + 1 };
    }
  }
}

// Singleton instance
export const voucherExpiryDetectorService = new VoucherExpiryDetectorService();

