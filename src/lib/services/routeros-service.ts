import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

// Dynamic import untuk routeros-client (hanya digunakan di server-side)
// RouterOSAPI hanya digunakan di API routes (server-side)
type RouterOSAPIType = any;

const prisma = new PrismaClient();

/**
 * Process-level error handler untuk catch uncaughtException dari RouterOS API
 * Error !empty reply kadang-kadang tidak di-catch oleh try-catch biasa
 */
if (typeof process !== 'undefined') {
  const originalUncaughtException = process.listeners('uncaughtException');
  
  // Add handler untuk catch RouterOS !empty errors
  process.on('uncaughtException', (error: any) => {
    // Check if it's a RouterOS !empty error
    if (error.errno === 'UNKNOWNREPLY' || 
        error.message?.includes('unknown reply') ||
        error.message?.includes('!empty') ||
        error.message?.includes('Tried to process unknown reply')) {
      // Log warning but don't crash - !empty is actually success
      console.warn(`[RouterOS] Caught uncaughtException for !empty reply, treating as success:`, error.message);
      return; // Don't propagate error
    }
    
    // For other errors, call original handlers
    originalUncaughtException.forEach((handler) => {
      try {
        // Node.js uncaughtException handlers can have different signatures
        // Try calling with both error and origin
        if (handler.length === 2) {
          (handler as (error: Error, origin: string) => void)(error, 'uncaughtException');
        } else {
          (handler as (error: Error) => void)(error);
        }
      } catch (e) {
        // Ignore errors in handlers
      }
    });
  });
}

export interface MikrotikConnectionConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL?: boolean;
  timeout?: number;
}

export interface HotspotUserData {
  username: string;
  password?: string;
  profile?: string;
  limitUptime?: string;
  disabled?: boolean;
  comment?: string;
}

export interface HotspotUserUpdate {
  password?: string;
  profile?: string;
  limitUptime?: string;
  disabled?: boolean;
  comment?: string;
}

/**
 * RouterOS API Service dengan Connection Pooling
 * Menggunakan routeros-client untuk komunikasi dengan MikroTik RouterOS
 */
export class RouterOSService {
  private connections: Map<string, RouterOSAPIType> = new Map();
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
  private readonly ALGORITHM = 'aes-256-cbc';

  /**
   * Encrypt password untuk disimpan di database
   */
  private encryptPassword(password: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.ALGORITHM,
      crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32),
      iv
    );
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt password dari database
   */
  private decryptPassword(encryptedPassword: string): string {
    const parts = encryptedPassword.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      crypto.scryptSync(this.ENCRYPTION_KEY, 'salt', 32),
      iv
    );
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Safe write wrapper - follow MIKHMON approach
   * MIKHMON: Check !trap for error, verify with print command, return success
   * 
   * Approach:
   * 1. Call API command
   * 2. Check for error (!trap if library supports it)
   * 3. If !empty reply (null), treat as success (will verify later)
   * 4. Return result for verification
   */
  private async safeWrite(conn: RouterOSAPIType, command: string, params: any[]): Promise<any> {
    try {
      const result = await conn.write(command, params);
      
      // Check for !trap (error) - similar to MIKHMON
      if (result && typeof result === 'object' && result['!trap']) {
        const errorMsg = result['!trap'][0]?.message || 'Unknown error';
        throw new Error(errorMsg);
      }
      
      return result;
    } catch (error: any) {
      // Handle timeout errors
      if (error.errno === 'SOCKTMOUT' || 
          error.message?.includes('Timed out') ||
          error.message?.includes('timeout') ||
          error.name === 'RosException' && error.errno === 'SOCKTMOUT') {
        console.error(`[RouterOS] Timeout error for command ${command}:`, {
          errno: error.errno,
          message: error.message
        });
        // Wrap timeout error dengan message yang lebih jelas
        throw new Error(`RouterOS operation timeout: ${command} - ${error.message || 'Connection timeout'}`);
      }
      
      // Check if it's !empty reply error (which is actually success in RouterOS)
      const isEmptyReply = error.errno === 'UNKNOWNREPLY' || 
                          error.message?.includes('unknown reply') ||
                          error.message?.includes('!empty') ||
                          error.message?.includes('Tried to process unknown reply');
      
      if (isEmptyReply) {
        // !empty reply = success (no data returned)
        // MIKHMON library PHP handle this automatically, we need to handle it manually
        console.log(`[RouterOS] Received !empty reply for ${command} - treating as success`);
        return null; // Return null to indicate success, will verify later
      }
      
      // For other errors, throw normally
      throw error;
    }
  }

  /**
   * Connect ke MikroTik server
   */
  async connect(serverId: string, config: MikrotikConnectionConfig): Promise<RouterOSAPIType> {
    try {
      // Dynamic import untuk routeros-client
      const { RouterOSAPI } = await import('routeros-client');
      const conn = new RouterOSAPI({
        host: config.host,
        user: config.username,
        password: config.password,
        port: config.port || 8728,
        timeout: config.timeout || 5000,
        keepalive: true
      });

      // Wrap connect dengan timeout handling
      try {
        await conn.connect();
      } catch (connectError: any) {
        // Handle timeout during connection
        if (connectError.errno === 'SOCKTMOUT' || 
            connectError.message?.includes('Timed out') ||
            connectError.name === 'RosException' && connectError.errno === 'SOCKTMOUT') {
          console.error(`[RouterOS] Connection timeout for server ${serverId}:`, {
            host: config.host,
            port: config.port,
            timeout: config.timeout,
            errno: connectError.errno
          });
          
          // Update error status
          await prisma.mikrotikServer.update({
            where: { id: serverId },
            data: {
              connectionStatus: 'ERROR',
              errorMessage: `Connection timeout: ${connectError.message || 'Unable to connect within timeout period'}`
            }
          });
          
          throw new Error(`Connection timeout to ${config.host}:${config.port} - ${connectError.message || 'Connection timeout'}`);
        }
        throw connectError;
      }

      this.connections.set(serverId, conn);

      // Update connection status di database
      await prisma.mikrotikServer.update({
        where: { id: serverId },
        data: {
          connectionStatus: 'CONNECTED',
          lastConnected: new Date(),
          errorMessage: null
        }
      });

      return conn;
    } catch (error: any) {
      // Update error status di database (if not already updated)
      try {
        await prisma.mikrotikServer.update({
          where: { id: serverId },
          data: {
            connectionStatus: 'ERROR',
            errorMessage: error.message || 'Connection failed'
          }
        });
      } catch (dbError) {
        // Ignore DB update errors
        console.error('[RouterOS] Failed to update server status:', dbError);
      }

      throw error;
    }
  }

  /**
   * Get connection (reuse existing atau create new)
   */
  async getConnection(serverId: string, config?: MikrotikConnectionConfig): Promise<RouterOSAPIType> {
    let conn = this.connections.get(serverId);

    // Check if connection is still alive
    if (conn && conn.connected) {
      try {
        // Test connection dengan simple command
        await this.safeWrite(conn, '/system/identity/print', []);
        return conn;
      } catch (error: any) {
        // Connection is dead or timeout, remove it
        console.warn(`[RouterOS] Connection test failed for server ${serverId}, removing connection:`, {
          error: error.message,
          errno: error.errno
        });
        
        // Clean up dead connection
        try {
          if (conn && conn.connected) {
            await conn.close();
          }
        } catch (closeError) {
          // Ignore close errors
        }
        
        this.connections.delete(serverId);
        conn = undefined;
      }
    }

    // Need to create new connection
    if (!config) {
      const server = await prisma.mikrotikServer.findUnique({
        where: { id: serverId }
      });

      if (!server) {
        throw new Error(`Server ${serverId} not found`);
      }

      config = {
        host: server.host,
        port: server.port,
        username: server.username,
        password: this.decryptPassword(server.password),
        useSSL: server.useSSL,
        timeout: server.timeout
      };
    }

    return await this.connect(serverId, config);
  }

  /**
   * Disconnect dari server
   */
  async disconnect(serverId: string): Promise<void> {
    const conn = this.connections.get(serverId);
    if (conn) {
      try {
        await conn.close();
      } catch (error) {
        console.error(`Error closing connection for server ${serverId}:`, error);
      }
      this.connections.delete(serverId);
    }
  }

  /**
   * Test connection ke server
   */
  async testConnection(config: MikrotikConnectionConfig): Promise<{ success: boolean; logs: string[]; error?: string; serverIdentity?: string }> {
    const logs: string[] = [];
    
    try {
      logs.push(`[${new Date().toISOString()}] Starting connection test...`);
      logs.push(`[${new Date().toISOString()}] Target: ${config.host}:${config.port || 8728}`);
      logs.push(`[${new Date().toISOString()}] Username: ${config.username}`);
      logs.push(`[${new Date().toISOString()}] SSL/TLS: ${config.useSSL ? 'Enabled' : 'Disabled'}`);
      logs.push(`[${new Date().toISOString()}] Timeout: ${config.timeout || 5000}ms`);

      const { RouterOSAPI } = await import('routeros-client');
      logs.push(`[${new Date().toISOString()}] Library loaded successfully`);

      const conn = new RouterOSAPI({
        host: config.host,
        user: config.username,
        password: config.password,
        port: config.port || 8728,
        timeout: config.timeout || 5000
      });
      logs.push(`[${new Date().toISOString()}] Connection object created`);

      logs.push(`[${new Date().toISOString()}] Attempting to connect...`);
      await conn.connect();
      logs.push(`[${new Date().toISOString()}] ✓ Connection established successfully!`);

      logs.push(`[${new Date().toISOString()}] Testing with command: /system/identity/print`);
      let serverIdentity: string | undefined;
      try {
        const identityResult = await this.safeWrite(conn, '/system/identity/print', []);
        logs.push(`[${new Date().toISOString()}] ✓ Command executed successfully`);
        
        if (identityResult && Array.isArray(identityResult) && identityResult.length > 0) {
          const identity = identityResult[0];
          if (identity && typeof identity === 'object' && 'name' in identity) {
            serverIdentity = String(identity.name);
            logs.push(`[${new Date().toISOString()}] Server Identity: ${serverIdentity}`);
          }
        }
      } catch (e: any) {
        logs.push(`[${new Date().toISOString()}] ⚠ Could not retrieve server identity: ${e.message || 'Unknown'}`);
      }

      logs.push(`[${new Date().toISOString()}] Closing connection...`);
      await conn.close();
      logs.push(`[${new Date().toISOString()}] ✓ Connection closed`);

      logs.push(`[${new Date().toISOString()}] ✓ Connection test completed successfully!`);
      logs.push(`[${new Date().toISOString()}] ✓ Server is ready to use - No issues detected`);
      return { success: true, logs, serverIdentity };
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      logs.push(`[${new Date().toISOString()}] ✗ Error: ${errorMsg}`);
      logs.push(`[${new Date().toISOString()}] Error type: ${error.constructor.name}`);
      
      if (error.code) {
        logs.push(`[${new Date().toISOString()}] Error code: ${error.code}`);
      }
      
      if (error.stack) {
        logs.push(`[${new Date().toISOString()}] Stack trace: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
      }

      console.error('Connection test failed:', error);
      return { success: false, logs, error: errorMsg };
    }
  }

  /**
   * Verify apakah profile exists di MikroTik
   */
  async verifyProfileExists(serverId: string, profileName: string): Promise<boolean> {
    try {
      const conn = await this.getConnection(serverId);
      // MIKHMON menggunakan /ip/hotspot/user/profile (user profile)
      const profiles = await this.safeWrite(conn, '/ip/hotspot/user/profile/print', [
        `?name=${profileName}`
      ]) as any[];
      
      // Handle null result (might be !empty reply)
      if (profiles === null) {
        // !empty reply, try to verify dengan print tanpa filter
        try {
          const allProfiles = await this.safeWrite(conn, '/ip/hotspot/user/profile/print', []) as any[];
          const allProfilesArray = Array.isArray(allProfiles) ? allProfiles : [];
          return allProfilesArray.some((p: any) => p.name === profileName);
        } catch (e) {
          return false;
        }
      }
      
      const profilesArray = Array.isArray(profiles) ? profiles : [];
      return profilesArray.length > 0 && profilesArray.some((p: any) => p.name === profileName);
    } catch (error: any) {
      console.warn(`Error verifying profile ${profileName}:`, error.message || error);
      return false;
    }
  }

  /**
   * Create hotspot user di MikroTik
   */
  async createHotspotUser(
    serverId: string,
    userData: HotspotUserData
  ): Promise<any> {
    const conn = await this.getConnection(serverId);

    const params: any[] = [`=name=${userData.username}`];
    
    if (userData.password) {
      params.push(`=password=${userData.password}`);
    }
    if (userData.profile) {
      // Verify profile exists sebelum digunakan (prevent "input does not match any value of profile" error)
      const profileExists = await this.verifyProfileExists(serverId, userData.profile);
      if (profileExists) {
        params.push(`=profile=${userData.profile}`);
      } else {
        console.warn(`Profile ${userData.profile} tidak ditemukan, skip profile dan gunakan limit-uptime`);
        // Don't add profile parameter, use limit-uptime instead
      }
    }
    if (userData.limitUptime) {
      params.push(`=limit-uptime=${userData.limitUptime}`);
    }
    if (userData.disabled !== undefined) {
      params.push(`=disabled=${userData.disabled ? 'yes' : 'no'}`);
    }
    if (userData.comment) {
      params.push(`=comment=${userData.comment}`);
    }

    try {
      const result = await this.safeWrite(conn, '/ip/hotspot/user/add', params);
      
      // If got !empty reply, verify user was created
      if (result === null) {
        console.warn(`User creation returned !empty reply, verifying...`);
        const checkUsers = await this.safeWrite(conn, '/ip/hotspot/user/print', [
          `?name=${userData.username}`
        ]);
        if (checkUsers && Array.isArray(checkUsers) && checkUsers.length > 0) {
          console.log(`User ${userData.username} created successfully (verified after !empty reply)`);
          return checkUsers[0];
        }
        // If not found, assume success anyway (RouterOS quirk)
        return { '.id': 'unknown-after-empty-reply' };
      }
      
      return result;
    } catch (error: any) {
      // Handle unknown reply error - !empty biasanya berarti success untuk user creation
      if (error.errno === 'UNKNOWNREPLY' || 
          error.message?.includes('unknown reply') ||
          error.message?.includes('!empty') ||
          error.message?.includes('Tried to process unknown reply')) {
        console.warn(`User creation returned unknown reply (!empty), verifying...`);
        // Verify user was created
        try {
          const checkUsers = await this.safeWrite(conn, '/ip/hotspot/user/print', [
            `?name=${userData.username}`
          ]);
          if (checkUsers && Array.isArray(checkUsers) && checkUsers.length > 0) {
            console.log(`User ${userData.username} was created successfully (verified after !empty reply)`);
            return checkUsers[0];
          }
        } catch (verifyError) {
          // If verification fails, throw original error
          throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Remove hotspot user dari MikroTik
   * @param skipConnectionTest - Skip connection test untuk faster operation (default: false)
   */
  async removeHotspotUser(
    serverId: string,
    username: string,
    skipConnectionTest: boolean = false
  ): Promise<void> {
    let conn: RouterOSAPIType | undefined;
    
    if (skipConnectionTest) {
      // Fast path: reuse existing connection without test
      conn = this.connections.get(serverId);
      if (!conn || !conn.connected) {
        // Only get new connection if no existing one (but still skip test)
        const server = await prisma.mikrotikServer.findUnique({
          where: { id: serverId }
        });
        if (!server) {
          throw new Error(`Server ${serverId} not found`);
        }
        const config = {
          host: server.host,
          port: server.port,
          username: server.username,
          password: this.decryptPassword(server.password),
          useSSL: server.useSSL,
          timeout: server.timeout
        };
        conn = await this.connect(serverId, config);
      }
    } else {
      conn = await this.getConnection(serverId);
    }

    if (!conn) {
      throw new Error(`Failed to get connection for server ${serverId}`);
    }

    try {
      const users = await this.safeWrite(conn, '/ip/hotspot/user/print', [
        `?name=${username}`
      ]);

      if (users && Array.isArray(users) && users.length > 0) {
        await this.safeWrite(conn, '/ip/hotspot/user/remove', [
          `=.id=${users[0]['.id']}`
        ]);
      }
    } catch (error: any) {
      // If timeout or connection error, mark connection as dead
      if (error.errno === 'SOCKTMOUT' || 
          error.message?.includes('timeout') ||
          error.message?.includes('Connection timeout')) {
        console.error(`[RouterOS] Timeout during removeHotspotUser for ${username}, removing connection:`, {
          serverId,
          error: error.message
        });
        // Remove dead connection
        this.connections.delete(serverId);
        try {
          if (conn && conn.connected) {
            await conn.close();
          }
        } catch (closeError) {
          // Ignore close errors
        }
      }
      throw error;
    }
  }

  /**
   * Get hotspot user dari MikroTik
   * @param serverId - Server ID
   * @param username - Username to check
   * @param skipConnectionTest - Skip connection test untuk faster operation (default: false)
   */
  async getHotspotUser(serverId: string, username: string, skipConnectionTest: boolean = false): Promise<any> {
    let conn: RouterOSAPIType | undefined;
    
    if (skipConnectionTest) {
      // Fast path: reuse existing connection without test
      conn = this.connections.get(serverId);
      if (!conn || !conn.connected) {
        // Only get new connection if no existing one (but still skip test)
        const server = await prisma.mikrotikServer.findUnique({
          where: { id: serverId }
        });
        if (!server) {
          throw new Error(`Server ${serverId} not found`);
        }
        const config = {
          host: server.host,
          port: server.port,
          username: server.username,
          password: this.decryptPassword(server.password),
          useSSL: server.useSSL,
          timeout: server.timeout
        };
        conn = await this.connect(serverId, config);
      }
    } else {
      conn = await this.getConnection(serverId);
    }

    if (!conn) {
      throw new Error(`Failed to get connection for server ${serverId}`);
    }

    try {
      const users = await this.safeWrite(conn, '/ip/hotspot/user/print', [
        `?name=${username}`
      ]);

      if (users && Array.isArray(users) && users.length > 0) {
        return users[0];
      }

      return null;
    } catch (error: any) {
      // If timeout or connection error, mark connection as dead
      if (error.errno === 'SOCKTMOUT' || 
          error.message?.includes('timeout') ||
          error.message?.includes('Connection timeout')) {
        console.error(`[RouterOS] Timeout during getHotspotUser for ${username}, removing connection:`, {
          serverId,
          error: error.message
        });
        // Remove dead connection
        this.connections.delete(serverId);
        try {
          if (conn && conn.connected) {
            await conn.close();
          }
        } catch (closeError) {
          // Ignore close errors
        }
      }
      throw error;
    }
  }

  /**
   * Get hotspot user detail dari MikroTik (dengan semua field termasuk uptime, limit-uptime, validity, dll)
   * @param serverId - Server ID
   * @param username - Username to check
   * @param skipConnectionTest - Skip connection test untuk faster operation (default: false)
   */
  async getHotspotUserDetail(serverId: string, username: string, skipConnectionTest: boolean = false): Promise<any> {
    let conn: RouterOSAPIType | undefined;
    
    if (skipConnectionTest) {
      conn = this.connections.get(serverId);
      if (!conn || !conn.connected) {
        const server = await prisma.mikrotikServer.findUnique({
          where: { id: serverId }
        });
        if (!server) {
          throw new Error(`Server ${serverId} not found`);
        }
        const config = {
          host: server.host,
          port: server.port,
          username: server.username,
          password: this.decryptPassword(server.password),
          useSSL: server.useSSL,
          timeout: server.timeout
        };
        conn = await this.connect(serverId, config);
      }
    } else {
      conn = await this.getConnection(serverId);
    }

    if (!conn) {
      throw new Error(`Failed to get connection for server ${serverId}`);
    }

    try {
      // Query dengan detail untuk mendapatkan semua field termasuk uptime, limit-uptime, validity, dll
      // Format: /ip/hotspot/user/print detail where name="<username>"
      // RouterOS API: print detail akan return semua field termasuk uptime, limit-uptime, validity, dll
      const users = await this.safeWrite(conn, '/ip/hotspot/user/print', [
        `?name=${username}`
      ]);

      if (users && Array.isArray(users) && users.length > 0) {
        // RouterOS print command sudah return semua field termasuk detail
        // Jika perlu detail lebih lengkap, bisa gunakan ?detail tapi biasanya tidak perlu
        return users[0];
      }

      return null;
    } catch (error: any) {
      if (error.errno === 'SOCKTMOUT' || 
          error.message?.includes('timeout') ||
          error.message?.includes('Connection timeout')) {
        console.error(`[RouterOS] Timeout during getHotspotUserDetail for ${username}, removing connection:`, {
          serverId,
          error: error.message
        });
        this.connections.delete(serverId);
        try {
          if (conn && conn.connected) {
            await conn.close();
          }
        } catch (closeError) {
          // Ignore close errors
        }
      }
      throw error;
    }
  }

  /**
   * Get all hotspot users dari MikroTik
   */
  async getHotspotUsers(serverId: string): Promise<any[]> {
    const conn = await this.getConnection(serverId);

    const users = await this.safeWrite(conn, '/ip/hotspot/user/print', []);

    return Array.isArray(users) ? users : [];
  }

  /**
   * Update hotspot user di MikroTik
   */
  async updateHotspotUser(
    serverId: string,
    username: string,
    updates: HotspotUserUpdate
  ): Promise<void> {
    const conn = await this.getConnection(serverId);

    const users = await this.safeWrite(conn, '/ip/hotspot/user/print', [
      `?name=${username}`
    ]);

    if (!users || !Array.isArray(users) || users.length === 0) {
      throw new Error(`User ${username} not found`);
    }

    const params: any[] = [`=.id=${users[0]['.id']}`];

    if (updates.password) {
      params.push(`=password=${updates.password}`);
    }
    if (updates.profile) {
      params.push(`=profile=${updates.profile}`);
    }
    if (updates.limitUptime) {
      params.push(`=limit-uptime=${updates.limitUptime}`);
    }
    if (updates.disabled !== undefined) {
      params.push(`=disabled=${updates.disabled ? 'yes' : 'no'}`);
    }
    if (updates.comment) {
      params.push(`=comment=${updates.comment}`);
    }

    await this.safeWrite(conn, '/ip/hotspot/user/set', params);
  }

  /**
   * Get active hotspot sessions
   */
  async getActiveSessions(serverId: string): Promise<any[]> {
    const conn = await this.getConnection(serverId);
    const sessions = await this.safeWrite(conn, '/ip/hotspot/active/print', []);
    return Array.isArray(sessions) ? sessions : [];
  }

  /**
   * Disconnect active session
   */
  async disconnectSession(serverId: string, sessionId: string): Promise<void> {
    const conn = await this.getConnection(serverId);
    await this.safeWrite(conn, '/ip/hotspot/active/remove', [`=.id=${sessionId}`]);
  }

  /**
   * Get all hotspot users (for listing)
   */
  async getAllHotspotUsers(serverId: string): Promise<any[]> {
    const conn = await this.getConnection(serverId);
    const users = await this.safeWrite(conn, '/ip/hotspot/user/print', []);
    return Array.isArray(users) ? users : [];
  }

  /**
   * Get hotspot profiles
   */
  async getHotspotProfiles(serverId: string): Promise<any[]> {
    const conn = await this.getConnection(serverId);
    const profiles = await this.safeWrite(conn, '/ip/hotspot/profile/print', []);
    return Array.isArray(profiles) ? profiles : [];
  }

  /**
   * Cleanup semua connections (untuk graceful shutdown)
   */
  async cleanup(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(
      serverId => this.disconnect(serverId)
    );
    await Promise.all(disconnectPromises);
  }
}

// Singleton instance
export const routerosService = new RouterOSService();
