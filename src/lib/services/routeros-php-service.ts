import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export interface RouterOSPHPConfig {
  host: string;
  port: number;
  username: string;
  password: string;
}

export interface ProfileParams {
  profileName: string;
  downloadSpeed?: string;
  uploadSpeed?: string;
  rateLimit?: string;
  limitUptime?: string;
  sharedUsers?: number;
  statusAutorefresh?: string;
  addressPool?: string;
  parentQueue?: string;
}

export interface UserParams {
  username: string;
  password?: string;
  profile?: string;
  limitUptime?: string;
  macCookieTimeout?: string;
  addMacCookie?: boolean;
  disabled?: boolean;
  comment?: string;
  server?: string;
}

/**
 * RouterOS PHP Service
 * Wrapper untuk call PHP scripts yang handle RouterOS operations
 * Menggunakan PHP RouterOS API library yang proven (seperti MIKHMON)
 */
export class RouterOSPHPService {
  private scriptsPath: string;

  constructor() {
    this.scriptsPath = path.join(process.cwd(), 'scripts', 'routeros-php');
  }

  /**
   * Execute PHP script dan return JSON result
   */
  private async executePHP(scriptName: string, args: string[]): Promise<any> {
    const scriptPath = path.join(this.scriptsPath, scriptName);
    const argsStr = args.map(arg => `"${arg.replace(/"/g, '\\"')}"`).join(' ');
    const command = `php ${scriptPath} ${argsStr}`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 10000, // 10 second timeout
        maxBuffer: 1024 * 1024 // 1MB buffer
      });

      // Check if stdout is empty but stderr has content
      if (!stdout || stdout.trim() === '') {
        if (stderr) {
          throw new Error(`PHP script error (no output): ${stderr}`);
        }
        throw new Error(`PHP script returned no output`);
      }

      // Try to parse JSON from stdout
      let result;
      try {
        result = JSON.parse(stdout.trim());
      } catch (parseError: any) {
        // If JSON parse fails, show both stdout and stderr
        throw new Error(`PHP script returned invalid JSON. stdout: ${stdout.substring(0, 500)}, stderr: ${stderr || 'none'}`);
      }
      
      if (!result.success) {
        throw new Error(result.error || 'PHP script returned error');
      }

      return result;
    } catch (error: any) {
      if (error.code === 'ETIMEDOUT') {
        throw new Error(`PHP script timeout: ${scriptName}`);
      }
      // Re-throw if already has message
      if (error.message) {
        throw error;
      }
      throw new Error(`Failed to execute PHP script: ${error.message || error}`);
    }
  }

  /**
   * Create or update hotspot profile
   */
  async createOrUpdateProfile(config: RouterOSPHPConfig, params: ProfileParams): Promise<any> {
    const phpParams = {
      sharedUsers: params.sharedUsers || 1,
      statusAutorefresh: params.statusAutorefresh || '1m',
      downloadSpeed: params.downloadSpeed,
      uploadSpeed: params.uploadSpeed,
      rateLimit: params.rateLimit,
      limitUptime: params.limitUptime,
      addressPool: params.addressPool,
      parentQueue: params.parentQueue
    };

    return await this.executePHP('create_profile.php', [
      config.host,
      String(config.port),
      config.username,
      config.password,
      params.profileName,
      JSON.stringify(phpParams)
    ]);
  }

  /**
   * Create hotspot user
   */
  async createUser(config: RouterOSPHPConfig, params: UserParams): Promise<any> {
    return await this.executePHP('create_user.php', [
      config.host,
      String(config.port),
      config.username,
      config.password,
      JSON.stringify(params)
    ]);
  }

  /**
   * Install expired voucher scheduler
   */
  async installScheduler(config: RouterOSPHPConfig): Promise<any> {
    return await this.executePHP('install_scheduler.php', [
      config.host,
      String(config.port),
      config.username,
      config.password
    ]);
  }

  /**
   * Check expired vouchers and disconnect them
   * Mirip dengan MIKHMON expire monitor, tapi dijalankan via CLI sebagai cron job
   */
  async checkExpiredVouchers(config: RouterOSPHPConfig): Promise<any> {
    return await this.executePHP('check_expired_vouchers.php', [
      config.host,
      String(config.port),
      config.username,
      config.password
    ]);
  }
}

export const routerosPHPService = new RouterOSPHPService();

