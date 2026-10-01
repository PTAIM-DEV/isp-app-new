import { PrismaClient } from '@prisma/client';
import { routerosService } from './routeros-service';
import { routerosPHPService, RouterOSPHPConfig } from './routeros-php-service';

const prisma = new PrismaClient();

/**
 * RouterOS Profile Service
 * Manage hotspot profiles dengan bandwidth limit dan masa berlaku
 * Implementasi mirip MIKHMON: script otomatis dikirim ke MikroTik
 */
export class RouterOSProfileService {
  /**
   * Generate on-login script untuk profile
   * Script ini dijalankan saat user login ke hotspot
   */
  private generateOnLoginScript(options: {
    expMode: 'rem' | 'ntf' | 'remc' | 'ntfc' | '0'; // remove, notice, remove&record, notice&record, none
    price: number;
    validity: string; // e.g., "12h", "1d"
    sellingPrice?: number;
    lockMac: boolean; // Lock MAC address
    recordUsage?: boolean; // Record usage to script
  }): string {
    const { expMode, price, validity, sellingPrice = 0, lockMac, recordUsage } = options;

    // Lock MAC address script
    const lockScript = lockMac 
      ? '; [:local mac $"mac-address"; /ip hotspot user set mac-address=$mac [find where name=$user]]'
      : '';

    // Record usage script (untuk tracking)
    const recordScript = recordUsage
      ? '; :local mac $"mac-address"; :local time [/system clock get time ]; /system script add name="$date-|-$time-|-$user-|-' + price + '-|-$address-|-$mac-|-' + validity + '-|-$comment" owner="$month$year" source="$date" comment="mikhmon"'
      : '';

    // Base on-login script
    let onLogin = `:put (",${expMode},${price},${validity},${sellingPrice},,${lockMac ? 'Enable' : 'Disable'},"); `;
    
    // Expiry handling script
    if (expMode !== '0') {
      onLogin += `{:local comment [ /ip hotspot user get [/ip hotspot user find where name="$user"] comment]; `;
      onLogin += `:local ucode [:pick $comment 0 2]; `;
      onLogin += `:if ($ucode = "vc" or $ucode = "up" or $comment = "") do={ `;
      onLogin += `:local date [ /system clock get date ];`;
      onLogin += `:local year [ :pick $date 7 11 ];`;
      onLogin += `:local month [ :pick $date 0 3 ];`;
      onLogin += `/sys sch add name="$user" disable=no start-date=$date interval="${validity}"; `;
      onLogin += `:delay 5s; `;
      onLogin += `:local exp [ /sys sch get [ /sys sch find where name="$user" ] next-run]; `;
      onLogin += `:local getxp [len $exp]; `;
      onLogin += `:if ($getxp = 15) do={ `;
      onLogin += `:local d [:pick $exp 0 6]; `;
      onLogin += `:local t [:pick $exp 7 16]; `;
      onLogin += `:local s ("/"); `;
      onLogin += `:local exp ("$d$s$year $t"); `;
      onLogin += `/ip hotspot user set comment="$exp" [find where name="$user"];`;
      onLogin += `}; `;
      onLogin += `:if ($getxp = 8) do={ `;
      onLogin += `/ip hotspot user set comment="$date $exp" [find where name="$user"];`;
      onLogin += `}; `;
      onLogin += `:if ($getxp > 15) do={ `;
      onLogin += `/ip hotspot user set comment="$exp" [find where name="$user"];`;
      onLogin += `};`;
      onLogin += `:delay 5s; `;
      onLogin += `/sys sch remove [find where name="$user"];`;

      // Add record script if needed
      if (expMode === 'remc' || expMode === 'ntfc') {
        onLogin += recordScript;
      }

      // Add lock script
      onLogin += lockScript;

      // Set expiry action
      if (expMode === 'rem' || expMode === 'remc') {
        onLogin += '}}';
      } else if (expMode === 'ntf' || expMode === 'ntfc') {
        onLogin += '}}';
      }
    } else if (price > 0) {
      // No expiry but has price
      onLogin = `:put (",,${price},,,noexp,${lockMac ? 'Enable' : 'Disable'},")` + lockScript;
    } else {
      onLogin = '';
    }

    return onLogin;
  }

  /**
   * Generate background service script untuk check expired vouchers
   * Script ini dijalankan oleh scheduler setiap beberapa detik
   */
  private generateBackgroundServiceScript(profileName: string, expMode: 'rem' | 'ntf' | 'remc' | 'ntfc'): string {
    const mode = expMode === 'rem' || expMode === 'remc' ? 'remove' : 'set limit-uptime=1s';

    return `:local dateint do={
  :local montharray ("jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec");
  :local days [:pick $d 4 6];
  :local month [:pick $d 0 3];
  :local year [:pick $d 7 11];
  :local monthint ([:find $montharray $month]);
  :local month ($monthint + 1);
  :if ([len $month] = 1) do={
    :local zero ("0");
    :return [:tonum ("$year$zero$month$days")];
  } else={
    :return [:tonum ("$year$month$days")];
  }
};
:local timeint do={
  :local hours [:pick $t 0 2];
  :local minutes [:pick $t 3 5];
  :return ($hours * 60 + $minutes);
};
:local date [/system clock get date];
:local time [/system clock get time];
:local today [$dateint d=$date];
:local curtime [$timeint t=$time];
:foreach i in=[/ip hotspot user find where profile="${profileName}"] do={
  :local comment [/ip hotspot user get $i comment];
  :local name [/ip hotspot user get $i name];
  :local gettime [:pick $comment 12 20];
  :if ([:pick $comment 3] = "/" and [:pick $comment 6] = "/") do={
    :local expd [$dateint d=$comment];
    :local expt [$timeint t=$gettime];
    :if (($expd < $today and $expt < $curtime) or ($expd < $today and $expt > $curtime) or ($expd = $today and $expt < $curtime)) do={
      [/ip hotspot user ${mode} $i];
      [/ip hotspot active remove [find where user=$name]];
    }
  }
}`;
  }

  /**
   * Helper function untuk handle RouterOS API write dengan error handling !empty
   * Delegate ke routerosService.safeWrite untuk consistency
   */
  private async safeWrite(conn: any, command: string, params: any[]): Promise<any> {
    // Use routerosService's safeWrite method for consistency
    // This ensures all RouterOS API calls use the same error handling
    return await routerosService['safeWrite'](conn, command, params);
  }

  /**
   * Create atau update hotspot profile di MikroTik
   * Profile ini digunakan untuk limit bandwidth dan masa berlaku voucher
   * Mirip dengan MIKHMON: script otomatis dikirim ke MikroTik
   */
  async createOrUpdateProfile(
    serverId: string,
    profileName: string,
    options: {
      downloadSpeed?: string; // e.g., "10M" (10 Mbps)
      uploadSpeed?: string;     // e.g., "5M" (5 Mbps)
      limitUptime?: string;     // e.g., "12h", "1d"
      sharedUsers?: number;      // Maximum shared users
      keepaliveTimeout?: string; // e.g., "2m"
      openStatusPage?: string;   // e.g., "http-login"
      statusAutorefresh?: string; // e.g., "1m"
      addressPool?: string;       // Address pool name
      parentQueue?: string;       // Parent queue name
      // Expiry options
      expMode?: 'rem' | 'ntf' | 'remc' | 'ntfc' | '0'; // Expiry mode
      validity?: string;          // Validity period (e.g., "12h")
      price?: number;             // Price
      sellingPrice?: number;      // Selling price
      lockMac?: boolean;          // Lock MAC address
      recordUsage?: boolean;      // Record usage
    }
  ): Promise<any> {
    // Try PHP script first (more reliable, like MIKHMON)
    try {
      const server = await prisma.mikrotikServer.findUnique({
        where: { id: serverId },
        select: { host: true, port: true, username: true, password: true }
      });

      if (server) {
        // Decrypt password
        const password = routerosService['decryptPassword'](server.password);
        
        const phpConfig: RouterOSPHPConfig = {
          host: server.host,
          port: server.port,
          username: server.username,
          password: password
        };

        const result = await routerosPHPService.createOrUpdateProfile(phpConfig, {
          profileName,
          downloadSpeed: options.downloadSpeed,
          uploadSpeed: options.uploadSpeed,
          limitUptime: options.limitUptime,
          sharedUsers: options.sharedUsers,
          statusAutorefresh: options.statusAutorefresh,
          addressPool: options.addressPool,
          parentQueue: options.parentQueue
        });

        console.log(`Profile ${profileName} ${result.action} successfully via PHP script`);
        return result;
      }
    } catch (phpError: any) {
      // PHP script failed - throw error (no fallback)
      console.error(`PHP script failed:`, phpError.message);
      throw new Error(`Failed to create/update profile via PHP: ${phpError.message}`);
    }
  }

  /**
   * Install scheduler untuk profile tertentu
   * Setiap profile memiliki scheduler sendiri dengan random interval
   */
  async installProfileScheduler(
    serverId: string,
    profileName: string,
    expMode: 'rem' | 'ntf' | 'remc' | 'ntfc',
    validity: string
  ): Promise<void> {
    const conn = await routerosService.getConnection(serverId);

    // Generate random start time (00:01-05:XX:XX)
    const randomHour = `0${Math.floor(Math.random() * 5) + 1}`;
    const randomMin = String(Math.floor(Math.random() * 50) + 10).padStart(2, '0');
    const randomSec = String(Math.floor(Math.random() * 50) + 10).padStart(2, '0');
    const randStartTime = `${randomHour}:${randomMin}:${randomSec}`;

    // Generate random interval (00:02:XX)
    const randomIntervalSec = String(Math.floor(Math.random() * 50) + 10).padStart(2, '0');
    const randInterval = `00:02:${randomIntervalSec}`;

    // Generate background service script
    const bgService = this.generateBackgroundServiceScript(profileName, expMode);

    // Check if script exists
    const scriptName = `profile-${profileName}`;
    const existingScripts = await this.safeWrite(conn, '/system script print', [
      `?name=${scriptName}`
    ]);
    const scripts = Array.isArray(existingScripts) ? existingScripts : [];

    if (scripts.length > 0) {
      // Update existing script
      await this.safeWrite(conn, '/system script set', [
        `=.id=${scripts[0]['.id']}`,
        `=source="${bgService}"`
      ]);
    } else {
      // Create new script
      await this.safeWrite(conn, '/system script add', [
        `=name=${scriptName}`,
        `=source="${bgService}"`,
        `=owner=admin`
      ]);
    }

    // Check if scheduler exists
    const existingSchedulers = await this.safeWrite(conn, '/system scheduler print', [
      `?name=${profileName}`
    ]);
    const schedulers = Array.isArray(existingSchedulers) ? existingSchedulers : [];

    if (schedulers.length > 0) {
      // Update existing scheduler
      await this.safeWrite(conn, '/system scheduler set', [
        `=.id=${schedulers[0]['.id']}`,
        `=start-time=${randStartTime}`,
        `=interval=${randInterval}`,
        `=on-event=${scriptName}`,
        `=disabled=no`,
        `=comment=Monitor Profile ${profileName}`
      ]);
    } else {
      // Create new scheduler
      await this.safeWrite(conn, '/system scheduler add', [
        `=name=${profileName}`,
        `=start-time=${randStartTime}`,
        `=interval=${randInterval}`,
        `=on-event=${scriptName}`,
        `=disabled=no`,
        `=comment=Monitor Profile ${profileName}`
      ]);
    }
  }

  /**
   * Remove scheduler untuk profile tertentu
   */
  async removeProfileScheduler(serverId: string, profileName: string): Promise<void> {
    const conn = await routerosService.getConnection(serverId);

    const scriptName = `profile-${profileName}`;

    // Remove scheduler
    const schedulers = await this.safeWrite(conn, '/system scheduler print', [
      `?name=${profileName}`
    ]);
    const schedulerList = Array.isArray(schedulers) ? schedulers : [];
    if (schedulerList.length > 0) {
      await this.safeWrite(conn, '/system scheduler remove', [
        `=.id=${schedulerList[0]['.id']}`
      ]);
    }

    // Remove script
    const scripts = await this.safeWrite(conn, '/system script print', [
      `?name=${scriptName}`
    ]);
    const scriptList = Array.isArray(scripts) ? scripts : [];
    if (scriptList.length > 0) {
      await this.safeWrite(conn, '/system script remove', [
        `=.id=${scriptList[0]['.id']}`
      ]);
    }
  }

  /**
   * Get all profiles dari MikroTik
   */
  async getProfiles(serverId: string): Promise<any[]> {
    return await routerosService.getHotspotProfiles(serverId);
  }

  /**
   * Delete profile dari MikroTik
   */
  async deleteProfile(serverId: string, profileName: string): Promise<void> {
    const conn = await routerosService.getConnection(serverId);

    // Remove scheduler first
    await this.removeProfileScheduler(serverId, profileName);

    // Remove profile
    const profiles = await this.safeWrite(conn, '/ip/hotspot/profile/print', [
      `?name=${profileName}`
    ]);
    const profileList = Array.isArray(profiles) ? profiles : [];

    if (profileList.length > 0) {
      await this.safeWrite(conn, '/ip/hotspot/profile/remove', [
        `=.id=${profileList[0]['.id']}`
      ]);
    }
  }

  /**
   * Install global expired voucher scheduler (legacy method)
   * Check semua user, bukan per profile
   */
  async installExpiredVoucherScheduler(serverId: string): Promise<void> {
    // Try PHP script first (more reliable, like MIKHMON)
    try {
      const server = await prisma.mikrotikServer.findUnique({
        where: { id: serverId },
        select: { host: true, port: true, username: true, password: true }
      });

      if (server) {
        // Decrypt password
        const password = routerosService['decryptPassword'](server.password);
        
        const phpConfig: RouterOSPHPConfig = {
          host: server.host,
          port: server.port,
          username: server.username,
          password: password
        };

        const result = await routerosPHPService.installScheduler(phpConfig);
        
        // Check if scheduler failed due to device mode
        if (result && typeof result === 'object' && result.scheduler_failed) {
          throw new Error(
            'Scheduler tidak bisa dibuat karena device mode RouterOS tidak mengizinkan scheduler. ' +
            'Silakan enable scheduler di RouterOS: System → Device Mode → Enable "Scheduler", lalu coba lagi.'
          );
        }
        
        console.log(`Scheduler installed successfully via PHP script`);
        return;
      }
    } catch (phpError: any) {
      // PHP script failed - throw error dengan pesan yang jelas
      console.error(`PHP script failed:`, phpError.message);
      
      // Jika error tentang device mode, beri pesan yang lebih jelas
      if (phpError.message && phpError.message.includes('device-mode')) {
        throw new Error(
          'Scheduler tidak bisa dibuat karena device mode RouterOS tidak mengizinkan scheduler. ' +
          'Silakan enable scheduler di RouterOS: System → Device Mode → Enable "Scheduler", lalu coba lagi.'
        );
      }
      
      throw new Error(`Failed to install scheduler: ${phpError.message}`);
    }
  }

  // Kode Node.js di bawah ini sudah tidak digunakan karena kita menggunakan PHP script
  // Dihapus untuk menghindari error TypeScript
  /*
    const scriptName = 'check-expired-vouchers';
    const scriptSource = `:local dateint do={
  :local montharray ("jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec");
  :local days [:pick $d 4 6];
  :local month [:pick $d 0 3];
  :local year [:pick $d 7 11];
  :local monthint ([:find $montharray $month]);
  :local month ($monthint + 1);
  :if ([len $month] = 1) do={
    :local zero ("0");
    :return [:tonum ("$year$zero$month$days")];
  } else={
    :return [:tonum ("$year$month$days")];
  }
};
:local timeint do={
  :local hours [:pick $t 0 2];
  :local minutes [:pick $t 3 5];
  :return ($hours * 60 + $minutes);
};
:local date [/system clock get date];
:local time [/system clock get time];
:local today [$dateint d=$date];
:local curtime [$timeint t=$time];
:foreach i in=[/ip hotspot user find] do={
  :local comment [/ip hotspot user get $i comment];
  :local name [/ip hotspot user get $i name];
  :local gettime [:pick $comment 12 20];
  :if ([:pick $comment 3] = "/" and [:pick $comment 6] = "/") do={
    :local expd [$dateint d=$comment];
    :local expt [$timeint t=$gettime];
    :if (($expd < $today and $expt < $curtime) or ($expd < $today and $expt > $curtime) or ($expd = $today and $expt < $curtime)) do={
      [/ip hotspot user set limit-uptime=1s $i];
      [/ip hotspot active remove [find where user=$name]];
    }
  }
}`;

      // Check if script exists
      // MIKHMON menggunakan /system/script/print (dengan slash)
      const existingScripts = await this.safeWrite(conn, '/system/script/print', [
        `?name=${scriptName}`
      ]);
      const scripts = Array.isArray(existingScripts) ? existingScripts : [];

      try {
        // Create or update script - follow MIKHMON approach
        if (scripts.length > 0) {
          // Update existing script
          await this.safeWrite(conn, '/system/script/set', [
            `=.id=${scripts[0]['.id']}`,
            `=source="${scriptSource}"`
          ]);
        } else {
          // Create new script
          await this.safeWrite(conn, '/system/script/add', [
            `=name=${scriptName}`,
            `=source="${scriptSource}"`,
            `=owner=admin`
          ]);
        }

        // Always verify script (like MIKHMON)
        const verifyScripts = await this.safeWrite(conn, '/system/script/print', [
          `?name=${scriptName}`
        ]) as any[];
      
      const verifyScriptResult = Array.isArray(verifyScripts) ? verifyScripts : [];
      if (verifyScriptResult.length === 0) {
        throw new Error('Scheduler script was not created/updated');
      }
      console.log(`Scheduler script ${scripts.length > 0 ? 'updated' : 'created'} successfully (verified)`);

        // Setup scheduler to run every 5 seconds
        // MIKHMON menggunakan /system/scheduler/print (dengan slash)
        const schedulerName = 'expired-voucher-checker';
        const existingSchedulers = await this.safeWrite(conn, '/system/scheduler/print', [
          `?name=${schedulerName}`
        ]);
        const schedulers = Array.isArray(existingSchedulers) ? existingSchedulers : [];

        if (schedulers.length > 0) {
          // Update existing scheduler
          await this.safeWrite(conn, '/system/scheduler/set', [
            `=.id=${schedulers[0]['.id']}`,
            `=start-time=startup`,
            `=interval=5s`,
            `=on-event=${scriptName}`,
            `=disabled=no`
          ]);
        } else {
          // Create new scheduler
          // Format sesuai dengan screenshot: start-time=startup, interval=5s
          await this.safeWrite(conn, '/system/scheduler/add', [
            `=name=${schedulerName}`,
            `=start-time=startup`,  // Start saat router boot
            `=interval=5s`,  // Check setiap 5 detik
            `=on-event=${scriptName}`,  // Script yang akan dijalankan
            `=disabled=no`,
            `=comment=Expired Voucher Checker`
          ]);
        }

        // Always verify scheduler (like MIKHMON)
        const verifySchedulers = await this.safeWrite(conn, '/system/scheduler/print', [
          `?name=${schedulerName}`
        ]) as any[];
      
      const verifySchedulerResult = Array.isArray(verifySchedulers) ? verifySchedulers : [];
      if (verifySchedulerResult.length === 0) {
        throw new Error('Scheduler was not created/updated');
      }
      console.log(`Scheduler ${schedulers.length > 0 ? 'updated' : 'created'} successfully (verified)`);
    } catch (error: any) {
      // For scheduler operations, verify before failing
      if (error.message?.includes('timeout') || error.message?.includes('unknown reply')) {
        console.warn(`Scheduler operation had error, verifying before failing:`, error.message);
        try {
          const verifySchedulers = await this.safeWrite(conn, '/system/scheduler/print', [
            `?name=expired-voucher-checker`
          ]) as any[];
          
          const verifyResult = Array.isArray(verifySchedulers) ? verifySchedulers : [];
          if (verifyResult.length > 0) {
            console.log(`Scheduler found after error, assuming success`);
            return; // Success
          }
        } catch (verifyError) {
          // Verification also failed, throw original error
          console.error(`Scheduler verification also failed`);
        }
      }
      
      console.error(`Error installing expired voucher scheduler:`, error);
      throw error;
    }
  }

  /**
   * Remove global scheduler script
   */
  async removeExpiredVoucherScheduler(serverId: string): Promise<void> {
    const conn = await routerosService.getConnection(serverId);

    const schedulerName = 'expired-voucher-checker';
    const scriptName = 'check-expired-vouchers';

    // Remove scheduler
    const schedulers = await this.safeWrite(conn, '/system/scheduler/print', [
      `?name=${schedulerName}`
    ]);
    const schedulerList = Array.isArray(schedulers) ? schedulers : [];
    if (schedulerList.length > 0) {
      await this.safeWrite(conn, '/system/scheduler/remove', [
        `=.id=${schedulerList[0]['.id']}`
      ]);
    }

    // Remove script
    const scripts = await this.safeWrite(conn, '/system/script/print', [
      `?name=${scriptName}`
    ]);
    const scriptList = Array.isArray(scripts) ? scripts : [];
    if (scriptList.length > 0) {
      await this.safeWrite(conn, '/system/script/remove', [
        `=.id=${scriptList[0]['.id']}`
      ]);
    }
  }

  /**
   * Check if global scheduler is installed
   */
  async isSchedulerInstalled(serverId: string): Promise<boolean> {
    const conn = await routerosService.getConnection(serverId);

    const schedulers = await this.safeWrite(conn, '/system/scheduler/print', [
      `?name=expired-voucher-checker`
    ]);
    const schedulerList = Array.isArray(schedulers) ? schedulers : [];

    return schedulerList.length > 0;
  }
}

// Singleton instance
export const routerosProfileService = new RouterOSProfileService();
