import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * WhatsApp Voucher Service
 * Handle pengiriman voucher via WhatsApp
 */
export class WhatsAppVoucherService {
  /**
   * Send voucher via WhatsApp
   */
  async sendVoucher(voucherId: string, phoneNumber: string): Promise<void> {
    const voucher = await prisma.hotspotVoucher.findUnique({
      where: { id: voucherId },
      include: {
        server: true,
        package: true
      }
    });

    if (!voucher) {
      throw new Error('Voucher not found');
    }

    // Format pesan voucher
    const message = this.formatVoucherMessage(voucher);

    // Convert phone number to WhatsApp JID format
    const jid = this.formatPhoneToJid(phoneNumber);

    // Send via WhatsApp Outgoing queue
    await prisma.whatsAppOutgoing.create({
      data: {
        jid,
        content: message,
        status: 'PENDING'
      }
    });

    // Update voucher dengan WhatsApp info
    await prisma.hotspotVoucher.update({
      where: { id: voucherId },
      data: {
        whatsappSent: true,
        whatsappSentAt: new Date(),
        whatsappJid: jid
      }
    });
  }

  /**
   * Send multiple vouchers via WhatsApp
   */
  async sendVouchers(voucherIds: string[], phoneNumber: string): Promise<void> {
    const vouchers = await prisma.hotspotVoucher.findMany({
      where: { id: { in: voucherIds } },
      include: {
        server: true,
        package: true
      }
    });

    if (vouchers.length === 0) {
      throw new Error('No vouchers found');
    }

    const jid = this.formatPhoneToJid(phoneNumber);

    // Format pesan untuk multiple vouchers
    let message = `📱 *VOUCHER HOTSPOT*\n\n`;
    message += `Anda menerima ${vouchers.length} voucher hotspot:\n\n`;

    vouchers.forEach((voucher, index) => {
      message += `*Voucher ${index + 1}:*\n`;
      message += this.formatVoucherMessage(voucher, false);
      message += `\n${'─'.repeat(30)}\n\n`;
    });

    message += `\n_Selamat menggunakan!_ 🎉`;

    // Send via WhatsApp Outgoing queue
    await prisma.whatsAppOutgoing.create({
      data: {
        jid,
        content: message,
        status: 'PENDING'
      }
    });

    // Update semua vouchers
    await prisma.hotspotVoucher.updateMany({
      where: { id: { in: voucherIds } },
      data: {
        whatsappSent: true,
        whatsappSentAt: new Date(),
        whatsappJid: jid
      }
    });
  }

  /**
   * Format voucher message untuk WhatsApp
   */
  private formatVoucherMessage(voucher: any, includeHeader: boolean = true): string {
    let message = '';

    if (includeHeader) {
      message += `📱 *VOUCHER HOTSPOT*\n\n`;
    }

    message += `*Kode Voucher:* ${voucher.code}\n`;

    if (voucher.username) {
      message += `*Username:* ${voucher.username}\n`;
    }

    if (voucher.password) {
      message += `*Password:* ${voucher.password}\n`;
    }

    message += `*Paket:* ${voucher.package?.name || 'N/A'}\n`;
    message += `*Durasi:* ${this.formatDuration(voucher.duration)}\n`;

    if (voucher.limitUptime) {
      message += `*Limit Uptime:* ${voucher.limitUptime}\n`;
    }

    message += `*Harga:* Rp ${Number(voucher.price).toLocaleString('id-ID')}\n`;

    if (voucher.server) {
      message += `*Server:* ${voucher.server.name}\n`;
    }

    message += `\n*Cara Menggunakan:*\n`;
    message += `1. Hubungkan ke WiFi hotspot\n`;
    message += `2. Buka browser, akan muncul halaman login\n`;
    message += `3. Masukkan ${voucher.username || voucher.code}${voucher.password ? ` dan password ${voucher.password}` : ''}\n`;
    message += `4. Klik Login\n\n`;

    if (voucher.expiresAt) {
      const expiresAt = new Date(voucher.expiresAt);
      message += `*Berlaku hingga:* ${expiresAt.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}\n`;
    }

    return message;
  }

  /**
   * Format duration dari menit ke format yang lebih readable
   */
  private formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} menit`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      if (mins === 0) {
        return `${hours} jam`;
      }
      return `${hours} jam ${mins} menit`;
    } else {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      if (hours === 0) {
        return `${days} hari`;
      }
      return `${days} hari ${hours} jam`;
    }
  }

  /**
   * Format phone number ke WhatsApp JID format
   */
  private formatPhoneToJid(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Remove leading 0 if exists
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Add country code if not present (assume Indonesia +62)
    if (!cleaned.startsWith('62')) {
      cleaned = '62' + cleaned;
    }

    return `${cleaned}@s.whatsapp.net`;
  }
}

// Singleton instance
export const whatsappVoucherService = new WhatsAppVoucherService();


