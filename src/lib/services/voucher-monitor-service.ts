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
 * Convert value ke integer
 */
function toInt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/**
 * Voucher Monitor Service - Pendekatan Robust
 * Single-pass sync dengan prioritas jelas: ACTIVE > USED > EXPIRED > UNUSED
 */
export class VoucherMonitorService {
  /**
   * Sync sessions dari semua server aktif dan update status voucher
   */
  async syncAllServersAndUpdateVouchers(): Promise<{
    serversProcessed: number;
    sessionsSynced: number;
    vouchersUpdated: number;
  }> {
    const activeServers = await prisma.mikrotikServer.findMany({
      where: { isActive: true }
    });

    let totalSessionsSynced = 0;
    let totalVouchersUpdated = 0;

    for (const server of activeServers) {
      try {
        console.log(`[SYNC] Processing server: ${server.name} (${server.id})`);
        const result = await this.syncServerSessions(server.id);
        totalSessionsSynced += result.sessionsSynced;
        totalVouchersUpdated += result.vouchersUpdated;
        console.log(`[SYNC] Server ${server.name}: ${result.sessionsSynced} sessions, ${result.vouchersUpdated} vouchers updated`);
      } catch (error: any) {
        console.error(`[SYNC] Error syncing server ${server.name}:`, error.message);
        // Continue with other servers
      }
    }

    return {
      serversProcessed: activeServers.length,
      sessionsSynced: totalSessionsSynced,
      vouchersUpdated: totalVouchersUpdated
    };
  }

  /**
   * Sync sessions dari satu server dan update status voucher
   * Pendekatan: Single-pass dengan prioritas jelas
   */
  async syncServerSessions(serverId: string): Promise<{
    sessionsSynced: number;
    vouchersUpdated: number;
  }> {
    try {
      // STEP 1: Get active sessions dari MikroTik (source of truth)
      console.log(`[SYNC ${serverId}] Step 1: Getting active sessions from MikroTik...`);
      const activeSessions = await routerosService.getActiveSessions(serverId);
      console.log(`[SYNC ${serverId}] Found ${activeSessions.length} active sessions in MikroTik`);

      // Extract usernames dari active sessions
      const activeUsernames = new Set<string>();
      for (const session of activeSessions) {
        const username = session.user || session['name'];
        if (username) {
          activeUsernames.add(username);
        }
      }

      // STEP 2: Sync sessions ke database dan update voucher ke ACTIVE
      console.log(`[SYNC ${serverId}] Step 2: Syncing sessions to database...`);
      let sessionsSynced = 0;
      const activeVoucherIds = new Set<string>();

      for (const session of activeSessions) {
        const username = session.user || session['name'];
        const sessionId = session['.id'];

        if (!username || !sessionId) continue;

        // Find voucher
        const voucher = await prisma.hotspotVoucher.findFirst({
          where: {
            serverId: serverId,
            OR: [
              { username: username },
              { code: username }
            ]
          }
        });

        if (voucher) {
          activeVoucherIds.add(voucher.id);
        }

        // Parse session data
        const bytesIn = BigInt(session['bytes-in'] || 0);
        const bytesOut = BigInt(session['bytes-out'] || 0);
        const packetsIn = toInt(session['packets-in']);
        const packetsOut = toInt(session['packets-out']);
        const duration = parseMikrotikDuration(session['uptime']);

        // Upsert session
        await prisma.hotspotSession.upsert({
          where: { mikrotikSessionId: sessionId },
          update: {
            bytesIn,
            bytesOut,
            packetsIn,
            packetsOut,
            duration,
            status: 'ACTIVE',
            ipAddress: session.address,
            macAddress: session['mac-address'],
            updatedAt: new Date()
          },
          create: {
            username,
            macAddress: session['mac-address'],
            ipAddress: session.address,
            serverId: serverId,
            voucherId: voucher?.id,
            startTime: new Date(),
            bytesIn,
            bytesOut,
            packetsIn,
            packetsOut,
            duration,
            mikrotikSessionId: sessionId,
            status: 'ACTIVE'
          }
        });

        sessionsSynced++;
      }

      // STEP 3: Mark stopped sessions (sessions yang tidak ada lagi di MikroTik)
      console.log(`[SYNC ${serverId}] Step 3: Marking stopped sessions...`);
      await this.markStoppedSessions(serverId, activeSessions);

      // STEP 4: Update semua voucher yang ada active session ke ACTIVE (batch update)
      console.log(`[SYNC ${serverId}] Step 4: Updating vouchers with active sessions to ACTIVE...`);
      if (activeVoucherIds.size > 0) {
        const activeVoucherIdsArray = Array.from(activeVoucherIds);
        // Update vouchers to ACTIVE one by one to handle activatedAt properly
        for (const voucherId of activeVoucherIdsArray) {
          const voucher = await prisma.hotspotVoucher.findUnique({
            where: { id: voucherId }
          });
          if (voucher && voucher.status !== 'ACTIVE') {
            await prisma.hotspotVoucher.update({
              where: { id: voucherId },
              data: {
                status: 'ACTIVE',
                lastUsedAt: new Date(),
                activatedAt: voucher.activatedAt || new Date()
              }
            });
          }
        }
        const updateResult = { count: activeVoucherIdsArray.length };
        console.log(`[SYNC ${serverId}] Updated ${updateResult.count} vouchers to ACTIVE`);
      }

      // STEP 5: Get semua synced vouchers untuk server ini dan update status berdasarkan prioritas
      console.log(`[SYNC ${serverId}] Step 5: Checking all synced vouchers for status updates...`);
      const allSyncedVouchers = await prisma.hotspotVoucher.findMany({
        where: {
          serverId: serverId,
          syncedToMikrotik: true
        },
        include: {
          sessions: {
            where: {
              OR: [
                { status: 'ACTIVE' },
                {
                  status: 'STOPPED',
                  stopTime: {
                    gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                  }
                }
              ]
            },
            orderBy: { startTime: 'desc' },
            take: 10 // Ambil 10 session terakhir
          }
        }
      });

      // Get all MikroTik users untuk check disabled status (limit uptime tercapai)
      let mikrotikUsers: any[] = [];
      try {
        mikrotikUsers = await routerosService.getHotspotUsers(serverId);
      } catch (error: any) {
        console.error(`[SYNC ${serverId}] Error getting MikroTik users:`, error.message);
      }

      // Create map: username -> user data (untuk quick lookup)
      const mikrotikUserMap = new Map<string, any>();
      for (const user of mikrotikUsers) {
        const username = user.name;
        if (username) {
          mikrotikUserMap.set(username, user);
        }
      }

      let vouchersUpdated = 0;
      const updatesToApply: Array<{ id: string; status: string; lastUsedAt?: Date; activatedAt?: Date }> = [];

      for (const voucher of allSyncedVouchers) {
        const username = voucher.username || voucher.code;
        const hasActiveSession = activeUsernames.has(username) || voucher.sessions.some(s => s.status === 'ACTIVE');
        const hasStoppedSession = voucher.sessions.some(s => s.status === 'STOPPED');
        const isExpired = voucher.expiresAt && voucher.expiresAt < new Date();
        
        // Check apakah user di MikroTik sudah disabled (karena limit uptime tercapai)
        const mikrotikUser = mikrotikUserMap.get(username);
        const isUserDisabled = mikrotikUser?.disabled === true || mikrotikUser?.disabled === 'true';
        const hasAnySessionHistory = voucher.sessions.length > 0;

        let newStatus: string | null = null;
        let lastUsedAt: Date | undefined = undefined;
        let activatedAt: Date | undefined = undefined;

        // Prioritas: ACTIVE > USED (limit uptime) > USED (stopped session) > EXPIRED > UNUSED
        if (hasActiveSession) {
          // Ada active session → ACTIVE
          if (voucher.status !== 'ACTIVE') {
            newStatus = 'ACTIVE';
            const activeSession = voucher.sessions.find(s => s.status === 'ACTIVE');
            activatedAt = voucher.activatedAt || activeSession?.startTime || new Date();
            lastUsedAt = new Date();
          }
        } else if (isUserDisabled && hasAnySessionHistory) {
          // User disabled di MikroTik dan pernah digunakan → USED (limit uptime tercapai)
          // Ini berarti voucher sudah mencapai limit uptime dan tidak bisa digunakan lagi
          if (voucher.status !== 'USED' && voucher.status !== 'EXPIRED') {
            newStatus = 'USED';
            const lastSession = voucher.sessions[0];
            lastUsedAt = lastSession?.stopTime || lastSession?.startTime || new Date();
            activatedAt = voucher.activatedAt || lastSession?.startTime || new Date();
            console.log(`[SYNC ${serverId}] Voucher ${voucher.code} reached limit uptime (user disabled in MikroTik)`);
          }
        } else if (hasStoppedSession) {
          // Tidak ada active session tapi ada stopped session → USED
          if (voucher.status !== 'USED' && voucher.status !== 'EXPIRED') {
            newStatus = 'USED';
            const stoppedSession = voucher.sessions.find(s => s.status === 'STOPPED');
            lastUsedAt = stoppedSession?.stopTime || stoppedSession?.startTime || new Date();
            activatedAt = voucher.activatedAt || stoppedSession?.startTime || new Date();
          }
        } else if (isExpired) {
          // Tidak ada session dan expired → EXPIRED
          if (voucher.status !== 'EXPIRED') {
            newStatus = 'EXPIRED';
          }
        } else {
          // Tidak ada session dan tidak expired → UNUSED
          if (voucher.status !== 'UNUSED' && voucher.status !== 'ACTIVE') {
            // Hanya update ke UNUSED jika bukan ACTIVE (karena mungkin baru saja disconnected)
            // Tunggu beberapa detik untuk memastikan session benar-benar stopped
            const lastSession = voucher.sessions[0];
            if (!lastSession || (lastSession.status === 'STOPPED' && lastSession.stopTime)) {
              const stopTime = lastSession?.stopTime || new Date();
              const secondsSinceStop = (Date.now() - stopTime.getTime()) / 1000;
              
              // Hanya update ke UNUSED jika sudah lebih dari 5 detik sejak stop
              if (secondsSinceStop > 5) {
                newStatus = 'UNUSED';
              }
            }
          }
        }

        if (newStatus) {
          updatesToApply.push({
            id: voucher.id,
            status: newStatus,
            lastUsedAt,
            activatedAt
          });
        }
      }

      // Apply batch updates
      if (updatesToApply.length > 0) {
        console.log(`[SYNC ${serverId}] Step 6: Applying ${updatesToApply.length} voucher status updates...`);
        for (const update of updatesToApply) {
          const voucher = await prisma.hotspotVoucher.findUnique({
            where: { id: update.id },
            select: { code: true }
          });
          await prisma.hotspotVoucher.update({
            where: { id: update.id },
            data: {
              status: update.status as any,
              ...(update.lastUsedAt && { lastUsedAt: update.lastUsedAt }),
              ...(update.activatedAt && { activatedAt: update.activatedAt })
            }
          });
          vouchersUpdated++;
          console.log(`[SYNC ${serverId}] Updated voucher ${voucher?.code || update.id} to ${update.status}`);
        }
      }

      console.log(`[SYNC ${serverId}] Sync completed: ${sessionsSynced} sessions, ${vouchersUpdated} vouchers updated`);

      return { sessionsSynced, vouchersUpdated };
    } catch (error: any) {
      console.error(`[SYNC ${serverId}] Error:`, error);
      throw error;
    }
  }

  /**
   * Mark stopped sessions (sessions yang tidak ada lagi di MikroTik)
   */
  async markStoppedSessions(serverId: string, activeSessions: any[]): Promise<void> {
    const activeSessionIds = new Set(
      activeSessions
        .map(s => s['.id'])
        .filter(Boolean)
    );

    // Find sessions that are ACTIVE in DB but not in MikroTik anymore
    const dbActiveSessions = await prisma.hotspotSession.findMany({
      where: {
        serverId: serverId,
        status: 'ACTIVE',
        mikrotikSessionId: { not: null }
      }
    });

    for (const dbSession of dbActiveSessions) {
      if (dbSession.mikrotikSessionId && !activeSessionIds.has(dbSession.mikrotikSessionId)) {
        // Session stopped
        await prisma.hotspotSession.update({
          where: { id: dbSession.id },
          data: {
            status: 'STOPPED',
            stopTime: new Date()
          }
        });
      }
    }
  }
}

// Singleton instance
export const voucherMonitorService = new VoucherMonitorService();
