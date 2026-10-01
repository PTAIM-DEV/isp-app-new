import { PrismaClient } from '@prisma/client';
import { routerosService } from './routeros-service';
import { routerosProfileService } from './routeros-profile-service';
import { routerosPHPService, RouterOSPHPConfig } from './routeros-php-service';

const prisma = new PrismaClient();

export interface VoucherGenerationOptions {
  prefix?: string;
  codeLength?: number;
  combination?: 'ALPHANUMERIC' | 'NUMERIC' | 'ALPHABET';
  username?: boolean;
  password?: boolean;
}

/**
 * Hotspot Voucher Service
 * Handle voucher generation, activation, dan sync ke MikroTik
 */
export class HotspotVoucherService {
  /**
   * Generate voucher codes
   */
  async generateVouchers(
    serverId: string,
    packageId: string,
    quantity: number,
    options: VoucherGenerationOptions,
    resellerUserId?: string
  ) {
    const package_ = await prisma.hotspotPackage.findUnique({
      where: { id: packageId },
      include: { server: true }
    });

    if (!package_) {
      throw new Error('Package not found');
    }

    if (package_.serverId !== serverId) {
      throw new Error('Package does not belong to this server');
    }

    const vouchers: Awaited<ReturnType<typeof prisma.hotspotVoucher.create>>[] = [];

    for (let i = 0; i < quantity; i++) {
      const code = this.generateCode(
        options.prefix || '',
        options.codeLength || 8,
        options.combination || 'ALPHANUMERIC'
      );

      const username = options.username ? code : null;
      const password = options.password ? this.generatePassword() : null;

      // Create voucher di database
      const voucher = await prisma.hotspotVoucher.create({
        data: {
          code,
          username,
          password,
          packageId,
          serverId,
          duration: package_.duration,
          limitUptime: package_.limitUptime,
          price: package_.price,
          prefix: options.prefix,
          codeLength: options.codeLength || 8,
          combination: options.combination || 'ALPHANUMERIC',
          status: 'UNUSED',
          resellerUserId: resellerUserId || null
        }
      });

      vouchers.push(voucher);
    }

    return vouchers;
  }

  /**
   * Activate voucher (sync ke MikroTik saat digunakan pertama kali)
   */
  async activateVoucher(code: string): Promise<any> {
    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { code },
      include: { server: true, package: true }
    });

    if (!voucher) {
      throw new Error('Voucher not found');
    }

    if (voucher.status !== 'UNUSED') {
      throw new Error('Voucher already used or activated');
    }

    // Sync ke MikroTik
    if (!voucher.syncedToMikrotik) {
      await this.syncVoucherToMikrotik(voucher.id);
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + voucher.duration);

    const updatedVoucher = await prisma.hotspotVoucher.update({
      where: { id: voucher.id },
      data: {
        status: 'ACTIVE',
        activatedAt: new Date(),
        expiresAt
      },
      include: {
        server: true,
        package: true
      }
    });

    return updatedVoucher;
  }

  /**
   * Sync voucher ke MikroTik RouterOS
   * Menggunakan profile jika package memiliki bandwidth limit
   */
  async syncVoucherToMikrotik(voucherId: string): Promise<void> {
    const syncStartTime = Date.now();
    console.log(`[SYNC VOUCHER] Starting syncVoucherToMikrotik for voucher ${voucherId}`);

    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id: voucherId },
      include: { server: true, package: true }
    });

    if (!voucher || voucher.syncedToMikrotik) {
      console.log(`[SYNC VOUCHER] Voucher ${voucherId} not found or already synced, skipping`);
      return;
    }

    const username = voucher.username || voucher.code;
    const password = voucher.password || voucher.code;
    // Prioritaskan limitUptime dari voucher (yang berasal dari package), jika tidak ada gunakan duration
    // Limit-uptime harus selalu di-set di user untuk memastikan user ter-logout sesuai waktu yang ditentukan
    const limitUptime = voucher.limitUptime || `${voucher.duration}m`;
    // Samakan mac-cookie-timeout dengan kuota waktu (limit-uptime) agar auto-login berlaku selama kuota
    const macCookieTimeout = limitUptime;
    const addMacCookie = true;

    console.log(`[SYNC VOUCHER] Voucher ${voucher.code}, username: ${username}, server: ${voucher.server.name}`);

    // Generate profile name dari package (mirip MIKHMON: tanpa spasi, pakai dash)
    // Follow MIKHMON approach: create profile, verify, use if exists
    let profileName: string | undefined;

    // Create profile jika ada bandwidth limit
    if (voucher.package && (voucher.package.downloadSpeed || voucher.package.uploadSpeed)) {
      const profileStartTime = Date.now();
      // Generate profile name dari package name (replace space dengan dash)
      profileName = (voucher.package.name || `PROFILE_${limitUptime}`)
        .replace(/\s+/g, '-')
        .toUpperCase();

      console.log(`[SYNC VOUCHER] Creating profile ${profileName} for package ${voucher.package.name}...`);

      // Create profile - follow MIKHMON approach
      try {
        const result = await routerosProfileService.createOrUpdateProfile(
          voucher.serverId,
          profileName,
          {
            downloadSpeed: voucher.package.downloadSpeed || undefined,
            uploadSpeed: voucher.package.uploadSpeed || undefined,
            limitUptime: limitUptime,
            sharedUsers: 1,
            statusAutorefresh: '1m',
          }
        );

        const profileTime = Date.now() - profileStartTime;
        console.log(`[SYNC VOUCHER] Profile ${profileName} creation completed in ${profileTime}ms:`, result);

        // Small delay untuk memastikan profile tersedia (RouterOS kadang butuh waktu)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify profile exists sebelum digunakan (like MIKHMON)
        const verifyStartTime = Date.now();
        const profileExists = await routerosService.verifyProfileExists(voucher.serverId, profileName);
        const verifyTime = Date.now() - verifyStartTime;
        console.log(`[SYNC VOUCHER] Profile verification completed in ${verifyTime}ms, exists: ${profileExists}`);

        if (!profileExists) {
          console.warn(`[SYNC VOUCHER] Profile ${profileName} tidak ditemukan setelah creation, skip profile dan gunakan limit-uptime`);
          profileName = undefined; // Skip profile, use limit-uptime
        } else {
          console.log(`[SYNC VOUCHER] Profile ${profileName} verified exists, akan digunakan untuk user`);
        }
      } catch (profileError: any) {
        const profileTime = Date.now() - profileStartTime;
        // For any error, verify dulu sebelum skip
        console.warn(`[SYNC VOUCHER] Profile creation had error after ${profileTime}ms for ${profileName}, verifying...`, profileError.message || profileError);

        // Verify apakah profile sudah ada (mungkin sudah dibuat sebelumnya)
        if (profileName) {
          try {
            const verifyStartTime = Date.now();
            const profileExists = await routerosService.verifyProfileExists(voucher.serverId, profileName);
            const verifyTime = Date.now() - verifyStartTime;
            console.log(`[SYNC VOUCHER] Profile verification (retry) completed in ${verifyTime}ms, exists: ${profileExists}`);

            if (!profileExists) {
              console.warn(`[SYNC VOUCHER] Profile ${profileName} tidak ditemukan, skip profile dan gunakan limit-uptime`);
              profileName = undefined; // Skip profile, use limit-uptime
            } else {
              console.log(`[SYNC VOUCHER] Profile ${profileName} ditemukan (mungkin sudah dibuat sebelumnya), akan digunakan`);
            }
          } catch (verifyError: any) {
            // Verification juga gagal, skip profile
            console.warn(`[SYNC VOUCHER] Profile verification gagal untuk ${profileName}, skip profile:`, verifyError.message);
            profileName = undefined; // Skip profile, use limit-uptime
          }
        }
      }
    } else {
      console.log(`[SYNC VOUCHER] No package or no bandwidth limit, skipping profile creation`);
    }

    // Format comment dengan expiry date (format: DD/MM/YYYY HH:MM)
    // Format ini sesuai dengan scheduler script yang check expired voucher
    // Scheduler script expect format: DD/MM/YYYY HH:MM (dengan slash di posisi 3 dan 6)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + voucher.duration);
    const expiryDate = expiresAt.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    const expiryTime = expiresAt.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    // Format: DD/MM/YYYY HH:MM (sesuai dengan scheduler script)
    // Scheduler script akan parse dengan [:pick $comment 3] = "/" dan [:pick $comment 6] = "/"
    // Dan [:pick $comment 12 20] untuk waktu HH:MM
    const comment = `${expiryDate} ${expiryTime}`;

    try {
      // Try PHP script first (more reliable, like MIKHMON)
      let result: any;
      const userCreateStartTime = Date.now();
      console.log(`[SYNC VOUCHER] Starting user creation for ${username}...`);

      // Fast path: coba create user via Node (routerosService) dengan timeout 10s
      let nodeCreateSucceeded = false;
      try {
        const nodeCreatePromise = routerosService.createHotspotUser(voucher.serverId, {
          username,
          password,
          profile: profileName,
          limitUptime,
          disabled: false,
          comment
        });
        const nodeCreateTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Node user creation timeout after 10s')), 10000)
        );
        await Promise.race([nodeCreatePromise, nodeCreateTimeout]);
        nodeCreateSucceeded = true;
        console.log(`[SYNC VOUCHER] User ${username} created via Node API (routerosService)`);
      } catch (nodeErr: any) {
        console.warn(`[SYNC VOUCHER] Node createHotspotUser failed, fallback to PHP:`, nodeErr.message || nodeErr);
      }

      try {
        const server = await prisma.mikrotikServer.findUnique({
          where: { id: voucher.serverId },
          select: { host: true, port: true, username: true, password: true }
        });

        if (server) {
          // Decrypt password
          const serverPassword = routerosService['decryptPassword'](server.password);

          const phpConfig: RouterOSPHPConfig = {
            host: server.host,
            port: server.port,
            username: server.username,
            password: serverPassword
          };

          // Jika profile tidak bisa digunakan (error sebelumnya), skip profile
          // User akan dibuat dengan limit-uptime saja
          let finalProfileName: string | undefined = profileName;

          console.log(`[SYNC VOUCHER] Creating user with profile: ${finalProfileName || 'none'}, limitUptime: ${limitUptime}`);

          // Try create user dengan profile
          // IMPORTANT: Selalu set limit-uptime di user, bahkan jika pakai profile
          // Ini memastikan user ter-logout sesuai waktu yang ditentukan (limit-uptime dari package)
          // Profile hanya untuk bandwidth limit, bukan untuk time limit
          try {
            // Add timeout untuk user creation (30 detik)
            const userCreatePromise = routerosPHPService.createUser(phpConfig, {
              username,
              password,
              profile: finalProfileName,
              limitUptime: limitUptime, // Selalu set limit-uptime, bahkan dengan profile
              macCookieTimeout,
              addMacCookie,
              disabled: false,
              comment: comment
            });

            const userCreateTimeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('User creation timeout after 30 seconds')), 30000)
            );

            result = await Promise.race([userCreatePromise, userCreateTimeout]);

            const userCreateTime = Date.now() - userCreateStartTime;
            console.log(`[SYNC VOUCHER] User ${username} created successfully via PHP script in ${userCreateTime}ms`);
          } catch (profileError: any) {
            const userCreateTime = Date.now() - userCreateStartTime;
            // Jika error karena profile tidak match, coba tanpa profile
            if (profileError.message?.includes('input does not match any value of profile') ||
              profileError.message?.includes('profile')) {
              console.warn(`[SYNC VOUCHER] Profile ${finalProfileName} tidak bisa digunakan setelah ${userCreateTime}ms, membuat user tanpa profile`);
              finalProfileName = undefined;

              // Retry tanpa profile
              const retryStartTime = Date.now();
              result = await routerosPHPService.createUser(phpConfig, {
                username,
                password,
                profile: undefined,
                limitUptime: limitUptime,
                disabled: false,
                comment: comment
              });

              const retryTime = Date.now() - retryStartTime;
              console.log(`[SYNC VOUCHER] User ${username} created without profile in ${retryTime}ms (retry)`);
            } else {
              // Other error, throw as is
              throw profileError;
            }
          }
        }
      } catch (phpError: any) {
        const userCreateTime = Date.now() - userCreateStartTime;
        // PHP script failed - throw error (no fallback)
        console.error(`[SYNC VOUCHER] PHP script failed after ${userCreateTime}ms:`, {
          error: phpError.message,
          stack: phpError.stack,
          username,
          serverId: voucher.serverId
        });
        throw new Error(`Failed to create user via PHP: ${phpError.message}`);
      }

      // Update voucher dengan MikroTik user ID
      // IMPORTANT: Simpan waktu sync dan hitung waktu expired
      // expiresAt = syncedAt + duration (dalam menit)
      const updateStartTime = Date.now();
      const syncedAt = new Date();
      const expiresAt = new Date(syncedAt);
      expiresAt.setMinutes(expiresAt.getMinutes() + voucher.duration);

      await prisma.hotspotVoucher.update({
        where: { id: voucherId },
        data: {
          mikrotikUserId: result['.id'],
          syncedToMikrotik: true,
          syncedAt: syncedAt,
          expiresAt: expiresAt // Simpan waktu expired yang dihitung dari syncedAt + duration
        }
      });
      const updateTime = Date.now() - updateStartTime;
      console.log(`[SYNC VOUCHER] Voucher updated in database in ${updateTime}ms`);

      // Auto-install scheduler untuk check expired vouchers jika belum ada
      // Install sekali saja per server (check via API)
      // Skip scheduler installation untuk avoid timeout (non-critical)
      // User bisa install scheduler manual jika diperlukan
      // NOTE: Scheduler check/install dilakukan dengan timeout untuk prevent hang
      try {
        const schedulerCheckStartTime = Date.now();

        // Add timeout untuk scheduler check (5 detik)
        const schedulerCheckPromise = routerosProfileService.isSchedulerInstalled(voucher.serverId);
        const schedulerCheckTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Scheduler check timeout')), 5000)
        );

        const schedulerInstalled = await Promise.race([schedulerCheckPromise, schedulerCheckTimeout]) as boolean;
        const schedulerCheckTime = Date.now() - schedulerCheckStartTime;
        console.log(`[SYNC VOUCHER] Scheduler check completed in ${schedulerCheckTime}ms, installed: ${schedulerInstalled}`);

        if (!schedulerInstalled) {
          console.log(`[SYNC VOUCHER] Auto-installing expired voucher scheduler for server ${voucher.serverId}...`);
          const schedulerInstallStartTime = Date.now();

          // Add timeout untuk scheduler install (10 detik)
          const schedulerInstallPromise = routerosProfileService.installExpiredVoucherScheduler(voucher.serverId);
          const schedulerInstallTimeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Scheduler install timeout')), 10000)
          );

          await Promise.race([schedulerInstallPromise, schedulerInstallTimeout]);
          const schedulerInstallTime = Date.now() - schedulerInstallStartTime;
          console.log(`[SYNC VOUCHER] Scheduler installed successfully in ${schedulerInstallTime}ms`);
        } else {
          console.log(`[SYNC VOUCHER] Scheduler already installed, skipping`);
        }
      } catch (schedulerError: any) {
        console.warn(`[SYNC VOUCHER] Failed to auto-install scheduler (non-critical):`, schedulerError.message);
        // Non-critical error - voucher sync still succeeded
      }

      const totalTime = Date.now() - syncStartTime;
      console.log(`[SYNC VOUCHER] Sync completed successfully in ${totalTime}ms for voucher ${voucher.code}`);
    } catch (error: any) {
      console.error(`Error syncing voucher ${voucher.code} to MikroTik:`, error);
      console.error('Error details:', {
        message: error.message,
        errno: error.errno,
        code: error.code,
        stack: error.stack
      });

      // Provide more detailed error message
      let errorMessage = `Failed to sync voucher to MikroTik`;
      if (error.errno === -113) {
        errorMessage = `Connection error: Unable to reach MikroTik server. Please check server connection.`;
      } else if (error.message) {
        errorMessage = `Failed to sync voucher: ${error.message}`;
      }

      throw new Error(errorMessage);
    }
  }

  /**
   * Record voucher sale
   */
  async recordSale(
    voucherId: string,
    quantity: number,
    unitPrice: number,
    paymentMethod?: string,
    resellerUserId?: string,
    notes?: string
  ) {
    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id: voucherId },
      include: { package: true, server: true }
    });

    if (!voucher) {
      throw new Error('Voucher not found');
    }

    const totalAmount = unitPrice * quantity;

    // Create sale record
    const sale = await prisma.voucherSale.create({
      data: {
        voucherId,
        packageId: voucher.packageId,
        serverId: voucher.serverId,
        quantity,
        unitPrice,
        totalAmount,
        paymentMethod: paymentMethod || 'CASH',
        paymentStatus: 'PAID',
        resellerUserId: resellerUserId || null,
        notes
      }
    });

    // Calculate and record komisi jika ada reseller
    if (resellerUserId) {
      await this.calculateAndRecordKomisi(sale.id, resellerUserId, voucher.packageId, voucher.serverId, totalAmount);
    }

    return sale;
  }

  /**
   * Calculate komisi berdasarkan rules
   */
  async calculateAndRecordKomisi(
    saleId: string,
    resellerUserId: string,
    packageId: string | null,
    serverId: string,
    baseAmount: number
  ) {
    // Find applicable komisi rules
    const rules = await prisma.komisiRule.findMany({
      where: {
        isActive: true,
        validFrom: { lte: new Date() },
        AND: [
          {
            OR: [
              { validUntil: null },
              { validUntil: { gte: new Date() } }
            ]
          },
          {
            OR: [
              { packageId: packageId || null },
              { packageId: null }
            ]
          },
          {
            OR: [
              { serverId: serverId },
              { serverId: null }
            ]
          }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Use first matching rule (priority: package > server > global)
    const rule = rules.find(r => r.packageId === packageId) ||
      rules.find(r => r.serverId === serverId) ||
      rules[0];

    if (!rule) {
      return; // No komisi rule found
    }

    // Check minimum sale amount
    if (rule.minSaleAmount && baseAmount < Number(rule.minSaleAmount)) {
      return; // Below minimum
    }

    // Calculate komisi
    let komisiAmount = 0;
    if (rule.komisiType === 'PERCENTAGE') {
      komisiAmount = baseAmount * (Number(rule.komisiValue) / 100);
    } else {
      komisiAmount = Number(rule.komisiValue);
    }

    // Apply max komisi limit
    if (rule.maxKomisiAmount && komisiAmount > Number(rule.maxKomisiAmount)) {
      komisiAmount = Number(rule.maxKomisiAmount);
    }

    // Create komisi record
    await prisma.komisiRecord.create({
      data: {
        resellerUserId,
        saleId,
        ruleId: rule.id,
        komisiAmount,
        komisiType: rule.komisiType,
        komisiValue: rule.komisiValue,
        baseAmount,
        status: 'PENDING'
      }
    });

    // Update sale dengan komisi info
    await prisma.voucherSale.update({
      where: { id: saleId },
      data: {
        komisiAmount,
        komisiStatus: 'PENDING'
      }
    });
  }

  /**
   * Generate code dengan format tertentu
   */
  private generateCode(prefix: string = '', length: number = 8, combination: string = 'ALPHANUMERIC'): string {
    let chars = '';
    if (combination === 'NUMERIC') {
      chars = '0123456789';
    } else if (combination === 'ALPHABET') {
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    } else {
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    }

    let code = prefix;
    for (let i = 0; i < length; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  /**
   * Generate password
   */
  private generatePassword(length: number = 8): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}

// Singleton instance
export const hotspotVoucherService = new HotspotVoucherService();


