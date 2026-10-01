/**
 * Auto-start voucher expiry detector scheduler
 * Import file ini di server-side untuk start scheduler otomatis
 */

import { voucherExpiryDetectorService } from './voucher-expiry-detector-service';

// Gunakan guard global agar tidak double start saat hot-reload / multiple import
const globalRef = globalThis as any;

if (typeof window === 'undefined' && !globalRef.__voucherExpiryDetectorStarted) {
  globalRef.__voucherExpiryDetectorStarted = true;
  console.log('[EXPIRY DETECTOR] Auto-starting scheduler (guarded)...');
  voucherExpiryDetectorService.start();
}

