/**
 * Utility functions untuk format WhatsApp JID
 */

/**
 * Format phone number ke WhatsApp JID format yang benar
 * Format: 6281234567890@s.whatsapp.net
 * 
 * @param phoneNumber - Nomor telepon dalam format apapun (081234567890, 6281234567890, dll)
 * @returns JID yang sudah diformat dengan benar
 */
export function formatPhoneToJid(phoneNumber: string): string {
    if (!phoneNumber) {
        throw new Error('Phone number is required');
    }

    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.length === 0) {
        throw new Error('Invalid phone number: no digits found');
    }

    // Remove leading 0 if exists
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    // Add country code if not present (assume Indonesia +62)
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }

    // Validate length (minimal 10 digit setelah country code)
    if (cleaned.length < 12 || cleaned.length > 15) {
        throw new Error(`Invalid phone number length: ${cleaned.length} digits (expected 12-15)`);
    }

    return `${cleaned}@s.whatsapp.net`;
}

/**
 * Validasi JID format
 * @param jid - JID untuk divalidasi
 * @returns true jika valid, false jika tidak
 */
export function isValidJid(jid: string): boolean {
    if (!jid || typeof jid !== 'string') {
        return false;
    }

    // Format: 6281234567890@s.whatsapp.net
    const jidPattern = /^62\d{9,12}@s\.whatsapp\.net$/;
    return jidPattern.test(jid);
}

/**
 * Normalisasi JID yang mungkin salah format
 * @param jid - JID yang mungkin salah format
 * @returns JID yang sudah dinormalisasi
 */
export function normalizeJid(jid: string): string {
    if (!jid) {
        throw new Error('JID is required');
    }

    // Jika sudah valid, return as is
    if (isValidJid(jid)) {
        return jid;
    }

    // Extract phone number dari JID
    const phoneMatch = jid.match(/^(\d+)@s\.whatsapp\.net$/);
    if (phoneMatch) {
        // Format phone number yang diekstrak
        return formatPhoneToJid(phoneMatch[1]);
    }

    // Jika tidak match pattern, coba format sebagai phone number
    return formatPhoneToJid(jid);
}

