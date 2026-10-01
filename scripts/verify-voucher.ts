#!/usr/bin/env ts-node
/**
 * Script untuk verify voucher di database dan MikroTik
 * Usage: ts-node scripts/verify-voucher.ts [voucher_code]
 */

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function verifyUserInMikrotik(
  host: string,
  port: number,
  username: string,
  password: string,
  userToCheck: string
): Promise<any> {
  const scriptPath = 'scripts/routeros-php/verify_user.php';
  const command = `php ${scriptPath} "${host}" "${port}" "${username}" "${password}" "${userToCheck}"`;
  
  try {
    const { stdout } = await execAsync(command);
    const result = JSON.parse(stdout.trim());
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to verify user'
    };
  }
}

async function decryptPassword(encryptedPassword: string): Promise<string> {
  // Simple decryption (same as routeros-service.ts)
  const crypto = require('crypto');
  const parts = encryptedPassword.split(':');
  if (parts.length !== 2) {
    return encryptedPassword; // Not encrypted
  }
  
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const key = Buffer.from(process.env.ENCRYPTION_KEY || 'your-32-char-secret-key-here!!', 'utf8');
  
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  const voucherCode = process.argv[2];
  
  if (!voucherCode) {
    console.log('Usage: ts-node scripts/verify-voucher.ts <voucher_code>');
    console.log('\nAtau tanpa parameter untuk list voucher terbaru:');
    
    const recentVouchers = await prisma.hotspotVoucher.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        server: {
          select: {
            name: true,
            host: true,
            port: true,
            username: true,
            password: true
          }
        },
        package: {
          select: {
            name: true,
            duration: true,
            downloadSpeed: true,
            uploadSpeed: true
          }
        }
      }
    });
    
    console.log('\n=== 10 Voucher Terbaru ===\n');
    recentVouchers.forEach((v, i) => {
      console.log(`${i + 1}. ${v.code} (${v.username || 'N/A'}) - ${v.status} - Server: ${v.server.name}`);
    });
    console.log('\nGunakan salah satu code di atas untuk verify.');
    await prisma.$disconnect();
    return;
  }
  
  console.log(`\n=== Verifying Voucher: ${voucherCode} ===\n`);
  
  // Get voucher from database
  const voucher = await prisma.hotspotVoucher.findUnique({
    where: { code: voucherCode },
    include: {
      server: {
        select: {
          name: true,
          host: true,
          port: true,
          username: true,
          password: true
        }
      },
      package: {
        select: {
          name: true,
          duration: true,
          downloadSpeed: true,
          uploadSpeed: true
        }
      }
    }
  });
  
  if (!voucher) {
    console.error(`❌ Voucher ${voucherCode} tidak ditemukan di database!`);
    await prisma.$disconnect();
    return;
  }
  
  console.log('📋 Data dari Database:');
  console.log(`   Code: ${voucher.code}`);
  console.log(`   Username: ${voucher.username || voucher.code}`);
  console.log(`   Password: ${voucher.password || voucher.code}`);
  console.log(`   Status: ${voucher.status}`);
  console.log(`   Synced to MikroTik: ${voucher.syncedToMikrotik ? '✅ Yes' : '❌ No'}`);
  console.log(`   MikroTik User ID: ${voucher.mikrotikUserId || 'N/A'}`);
  console.log(`   Server: ${voucher.server.name} (${voucher.server.host}:${voucher.server.port})`);
  console.log(`   Package: ${voucher.package?.name || 'N/A'}`);
  console.log(`   Duration: ${voucher.duration} menit`);
  console.log(`   Limit Uptime: ${voucher.limitUptime || 'N/A'}`);
  console.log(`   Bandwidth: ${voucher.package?.downloadSpeed || 'N/A'} / ${voucher.package?.uploadSpeed || 'N/A'}`);
  console.log(`   Created: ${voucher.createdAt}`);
  console.log(`   Synced At: ${voucher.syncedAt || 'N/A'}`);
  
  // Verify in MikroTik
  if (voucher.syncedToMikrotik && voucher.server) {
    console.log('\n🔍 Verifying di MikroTik...');
    
    const username = voucher.username || voucher.code;
    const serverPassword = await decryptPassword(voucher.server.password);
    
    const mikrotikResult = await verifyUserInMikrotik(
      voucher.server.host,
      voucher.server.port,
      voucher.server.username,
      serverPassword,
      username
    );
    
    if (mikrotikResult.success && mikrotikResult.exists) {
      console.log('\n✅ User ditemukan di MikroTik!');
      console.log('\n📋 Data dari MikroTik:');
      const userData = mikrotikResult.data;
      console.log(`   ID: ${userData['.id']}`);
      console.log(`   Name: ${userData.name}`);
      console.log(`   Profile: ${userData.profile || 'default'}`);
      console.log(`   Limit Uptime: ${userData['limit-uptime'] || 'N/A'}`);
      console.log(`   Comment: ${userData.comment || 'N/A'}`);
      console.log(`   Disabled: ${userData.disabled || 'false'}`);
      console.log(`   Uptime: ${userData.uptime || '0s'}`);
      
      // Compare
      console.log('\n🔍 Perbandingan:');
      const dbUsername = voucher.username || voucher.code;
      const mtUsername = userData.name;
      const dbPassword = voucher.password || voucher.code;
      
      if (dbUsername === mtUsername) {
        console.log(`   ✅ Username match: ${dbUsername}`);
      } else {
        console.log(`   ❌ Username mismatch: DB=${dbUsername}, MT=${mtUsername}`);
      }
      
      if (voucher.mikrotikUserId && userData['.id'] === voucher.mikrotikUserId) {
        console.log(`   ✅ MikroTik User ID match: ${voucher.mikrotikUserId}`);
      } else if (voucher.mikrotikUserId) {
        console.log(`   ⚠️  MikroTik User ID mismatch: DB=${voucher.mikrotikUserId}, MT=${userData['.id']}`);
      }
      
      const expectedComment = voucher.expiresAt 
        ? new Date(voucher.expiresAt).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          }) + ' ' + new Date(voucher.expiresAt).toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          })
        : null;
      
      if (expectedComment && userData.comment) {
        if (userData.comment.includes(expectedComment.split(' ')[0])) {
          console.log(`   ✅ Comment format match (expiry date)`);
        } else {
          console.log(`   ⚠️  Comment format mungkin berbeda`);
          console.log(`      Expected: ${expectedComment}`);
          console.log(`      Actual: ${userData.comment}`);
        }
      }
      
    } else {
      console.log('\n❌ User TIDAK ditemukan di MikroTik!');
      if (mikrotikResult.error) {
        console.log(`   Error: ${mikrotikResult.error}`);
      }
    }
  } else {
    console.log('\n⚠️  Voucher belum di-sync ke MikroTik');
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);






