import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

let transporter: nodemailer.Transporter | null = null;
let lastConfigHash: string | null = null;

function getConfigHash(): string {
    return `${SMTP_HOST}:${SMTP_PORT}:${SMTP_USER}:${SMTP_PASS}`;
}

function getTransporter() {
    const currentConfigHash = getConfigHash();
    
    // Recreate transporter if config changed or doesn't exist
    if (!transporter || lastConfigHash !== currentConfigHash) {
        if (!SMTP_USER || !SMTP_PASS) {
            console.warn('[Email] SMTP credentials not configured. Email sending will be disabled.');
            transporter = null;
            lastConfigHash = null;
            return null;
        }

        console.log('[Email] Creating new transporter with updated SMTP configuration');
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: SMTP_PORT,
            secure: SMTP_PORT === 465, // true for 465, false for other ports
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS,
            },
        });
        lastConfigHash = currentConfigHash;
    }
    
    return transporter;
}

export interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
    // ⚠️ CHECK: Jika email untuk payment reminder, disable sementara
    // Cek apakah subject mengandung kata kunci reminder (tapi bukan welcome message)
    const isWelcomeEmail = options.subject && (
        options.subject.toLowerCase().includes('selamat datang') ||
        options.subject.toLowerCase().includes('welcome')
    );
    
    const isReminderEmail = !isWelcomeEmail && options.subject && (
        options.subject.toLowerCase().includes('tagihan') ||
        options.subject.toLowerCase().includes('reminder') ||
        options.subject.toLowerCase().includes('pembayaran') ||
        options.subject.toLowerCase().includes('invoice') ||
        (options.html?.includes('tagihan') && !options.html?.includes('Selamat datang')) ||
        (options.html?.includes('reminder') && !options.html?.includes('Selamat datang')) ||
        (options.html?.includes('pembayaran') && !options.html?.includes('Selamat datang'))
    );

    if (isReminderEmail) {
        console.log(`[Email] ⚠️ Payment reminder email DISABLED - Would send to: ${options.to}`);
        console.log(`[Email]   Subject: ${options.subject}`);
        return false; // Always return false for reminder emails
    }

    try {
        const transporter = getTransporter();
        if (!transporter) {
            console.warn('[Email] Cannot send email: SMTP not configured');
            console.warn('[Email] SMTP_HOST:', SMTP_HOST);
            console.warn('[Email] SMTP_PORT:', SMTP_PORT);
            console.warn('[Email] SMTP_USER:', SMTP_USER ? 'set' : 'not set');
            console.warn('[Email] SMTP_PASS:', SMTP_PASS ? 'set' : 'not set');
            console.warn('[Email] SMTP_FROM:', SMTP_FROM);
            return false;
        }

        // Verify connection before sending
        await transporter.verify();

        const info = await transporter.sendMail({
            from: `"ISP Management" <${SMTP_FROM}>`,
            to: options.to,
            subject: options.subject,
            text: options.text || options.html.replace(/<[^>]*>/g, ''),
            html: options.html,
        });

        console.log(`[Email] Message sent successfully: ${info.messageId}`);
        console.log(`[Email] To: ${options.to}, Subject: ${options.subject}`);
        return true;
    } catch (error: any) {
        console.error('[Email] Error sending email:', error);
        console.error('[Email] Error message:', error.message);
        console.error('[Email] Error code:', error.code);
        
        // Provide helpful error messages
        if (error.message && error.message.includes('Invalid login')) {
            console.error('[Email] ⚠️ Gmail authentication failed. Make sure you are using App Password, not regular password.');
            console.error('[Email] 📖 How to create App Password: https://support.google.com/accounts/answer/185833');
        }
        
        throw error; // Re-throw untuk mendapatkan detail error di endpoint
    }
}


