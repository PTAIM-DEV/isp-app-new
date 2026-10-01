import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Save PDF buffer to temporary file and return file path
 * This file will be used by WhatsApp worker to send as document
 */
export function savePDFToTemp(pdfBuffer: Buffer, fileName: string): string {
    const tempDir = join(process.cwd(), 'public', 'uploads', 'whatsapp', 'temp');
    
    // Ensure temp directory exists
    if (!existsSync(tempDir)) {
        const fs = require('fs');
        fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const filePath = join(tempDir, fileName);
    writeFileSync(filePath, pdfBuffer);
    
    return filePath;
}

/**
 * Clean up temporary PDF file after sending
 */
export function cleanupTempPDF(filePath: string): void {
    try {
        if (existsSync(filePath)) {
            unlinkSync(filePath);
            console.log(`[WhatsApp Media] Cleaned up temp file: ${filePath}`);
        }
    } catch (error) {
        console.error(`[WhatsApp Media] Error cleaning up temp file:`, error);
    }
}

