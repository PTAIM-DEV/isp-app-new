import puppeteer from 'puppeteer';
import { Readable } from 'stream';

/**
 * Generate PDF from HTML content
 */
export async function generatePDFFromHTML(html: string): Promise<Buffer> {
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
            ],
        });

        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '15mm',
                bottom: '20mm',
                left: '15mm',
            },
        });

        return Buffer.from(pdf);
    } catch (error) {
        console.error('[PDF Generator] Error generating PDF:', error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Convert PDF buffer to base64 string
 */
export function pdfToBase64(pdfBuffer: Buffer): string {
    return pdfBuffer.toString('base64');
}

/**
 * Convert PDF buffer to data URL
 */
export function pdfToDataURL(pdfBuffer: Buffer): string {
    const base64 = pdfToBase64(pdfBuffer);
    return `data:application/pdf;base64,${base64}`;
}

