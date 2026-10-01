import { PrismaClient, UserStatus, Role } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

// Configuration
const DATA_DIR = path.join(__dirname, '../data');
const CSV_FILES = [
    'Master_Data_Pelanggan_Merged - ACTIVE.csv',
    'Master_Data_Pelanggan_Merged - BLOCKED.csv'
];

// Mapping for Status
const STATUS_MAP: Record<string, UserStatus> = {
    'ACTIVE': UserStatus.ACTIVE,
    'BLOCKED': UserStatus.BLOCKED,
};

// Interface for CSV Row
interface CsvRow {
    MASTER_NAME: string;
    MASTER_PHONE: string;
    MASTER_ADDRESS: string;
    MASTER_PRICE: string;
    MASTER_PRODUCT: string;
    MASTER_STATUS: string;
    MASTER_ID: string;
    MASTER_NIK: string;
    SOURCE_FILE: string;
    Email: string;
    Region: string;
    MASTER_LAST_PAYMENT_DATE: string;
    MASTER_ACTIVATION_DATE: string;
}

// Stats
const stats = {
    total: 0,
    processed: 0,
    skipped: 0,
    updated: 0,
    created: 0,
    errors: 0
};

// Helper: Sanitize Phone
function sanitizePhone(phone: string): string | null {
    if (!phone || phone === '-') return null;
    let p = phone.replace(/[^0-9]/g, ''); // Remove non-numeric

    if (p.startsWith('08')) {
        p = '62' + p.substring(1);
    } else if (p.startsWith('8')) {
        p = '62' + p;
    }

    // Basic validation length (Indonesia mobile)
    if (p.length < 10 || p.length > 15) return null;

    return p;
}

// Helper: Parse Date (dd/mm/yyyy or dd/mm/yy)
function parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr === '-') return null;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return null;

    let year = parseInt(parts[2]);
    const month = parseInt(parts[1]) - 1; // 0-based
    const day = parseInt(parts[0]);

    // Handle 2-digit years (e.g. 22 -> 2022, 99 -> 1999?)
    // Basic heuristic: if year < 100, assume 20xx. 
    // Data seems to be recent customers.
    if (year < 100) {
        year += 2000;
    }

    return new Date(year, month, day);
}

// Helper: Add Months
function addMonths(date: Date, months: number): Date {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
}

// Helper: Parse currency formatted string
function parsePrice(priceStr: string): number {
    if (!priceStr) return 0;
    return parseInt(priceStr.replace(/[^0-9]/g, '')) || 0;
}

async function getOrCreateSalesUser() {
    const salesEmail = 'ryan@ryconnect.mdc'; // Dummy email
    let sales = await prisma.user.findFirst({
        where: {
            OR: [
                { name: 'Ryan' },
                { email: salesEmail }
            ]
        }
    });

    if (!sales) {
        console.log('Creating Sales User: Ryan...');
        sales = await prisma.user.create({
            data: {
                name: 'Ryan',
                email: salesEmail,
                phone: '628000000000', // Dummy phone
                role: Role.SALES,
                status: UserStatus.ACTIVE
            }
        });
    }
    return sales;
}

async function processFile(filePath: string, salesUserId: string | null) {
    console.log(`\nProcessing file: ${path.basename(filePath)}...`);

    const results: CsvRow[] = [];

    await new Promise<void>((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve())
            .on('error', (err) => reject(err));
    });

    console.log(`Found ${results.length} rows.`);
    stats.total += results.length;

    for (const row of results) {
        try {
            const name = row.MASTER_NAME?.trim();
            const rawPhone = row.MASTER_PHONE?.trim();
            const rawEmail = row.Email?.trim();
            const rawNik = row.MASTER_NIK?.trim();
            const address = row.MASTER_ADDRESS?.trim();
            const statusStr = row.MASTER_STATUS?.trim().toUpperCase();
            const region = row.Region?.trim();
            const masterId = row.MASTER_ID?.trim();

            const joinDate = parseDate(row.MASTER_ACTIVATION_DATE);
            const lastPaymentDate = parseDate(row.MASTER_LAST_PAYMENT_DATE);

            // Subscription Data
            const planName = row.MASTER_PRODUCT?.trim() || 'Unknown Plan';
            const price = parsePrice(row.MASTER_PRICE);

            // Calculate Next Billing Date
            let nextBillingDate: Date | null = null;
            if (lastPaymentDate) {
                nextBillingDate = addMonths(lastPaymentDate, 1);
            } else if (joinDate) {
                // Fallback: if no last payment, assume next bill is 1 month after join? 
                // Or keep null? Let's use Join+1 for safety if active.
                nextBillingDate = addMonths(joinDate, 1);
            }

            if (!name) {
                console.warn(`Row skipped (No Name): ${JSON.stringify(row)}`);
                stats.skipped++;
                continue;
            }

            // 1. Sanitize Data
            const phone = sanitizePhone(rawPhone);
            const email = (rawEmail && rawEmail !== '-' && rawEmail.includes('@')) ? rawEmail : null;
            const nik = (rawNik && rawNik !== '-' && rawNik.length > 5) ? rawNik : null;

            if (!phone) {
                console.warn(`Row skipped (Invalid Phone): ${name} - ${rawPhone}`);
                stats.skipped++;
                continue;
            }

            const status = STATUS_MAP[statusStr] || UserStatus.LEAD;

            // 2. Check Duplicates (Logic: ID OR Phone OR Email OR NIK)
            const existingUser = await prisma.user.findFirst({
                where: {
                    OR: [
                        ...(masterId ? [{ id: masterId }] : []), // Check ID first if exists
                        { phone: phone },
                        ...(email ? [{ email: email }] : []),
                        ...(nik ? [{ nik: nik }] : [])
                    ]
                }
            });

            // 3. Update or Create
            if (existingUser) {
                // UPDATE
                await prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        status: status,
                        address: address !== '-' ? address : undefined,
                        // Upsert Subscription
                        subscription: {
                            upsert: {
                                create: {
                                    planName: planName,
                                    price: price,
                                    billingCycle: 30,
                                    startDate: joinDate,
                                    activatedDate: joinDate,
                                    nextBillingDate: nextBillingDate,
                                    isTrialActive: false,
                                    isPrepaidActive: false
                                },
                                update: {
                                    nextBillingDate: nextBillingDate, // Sync latest
                                    price: price,
                                    startDate: joinDate,
                                    activatedDate: joinDate
                                }
                            }
                        }
                    }
                });
                stats.updated++;
                process.stdout.write('.');
            } else {
                // CREATE
                // Determine Sales Person
                let assignedSalesId = null;
                if (region === 'RYCONNECT MDC' || region === 'RCO') {
                    assignedSalesId = salesUserId;
                }

                // Use masterId as ID if available
                const idPayload = masterId ? { id: masterId } : {};

                await prisma.user.create({
                    data: {
                        ...idPayload,
                        name: name,
                        phone: phone,
                        email: email,
                        nik: nik,
                        address: address !== '-' ? address : null,
                        status: status,
                        role: Role.CUSTOMER,
                        salesPersonId: assignedSalesId,
                        joinDate: joinDate || undefined,
                        createdAt: joinDate || undefined,
                        // Create Subscription
                        subscription: {
                            create: {
                                planName: planName,
                                price: price,
                                billingCycle: 30,
                                startDate: joinDate,
                                activatedDate: joinDate,
                                nextBillingDate: nextBillingDate,
                                isTrialActive: false,
                                isPrepaidActive: false
                            }
                        }
                    }
                });
                stats.created++;
                process.stdout.write('+');
            }

            stats.processed++;
        } catch (error) {
            console.error(`\nError processing row ${row.MASTER_NAME}:`, error);
            stats.errors++;
        }
    }
}

async function main() {
    try {
        const salesUser = await getOrCreateSalesUser();
        console.log(`Sales User 'Ryan' ID: ${salesUser.id}`);

        for (const file of CSV_FILES) {
            const filePath = path.join(DATA_DIR, file);
            if (fs.existsSync(filePath)) {
                await processFile(filePath, salesUser.id);
            } else {
                console.error(`File not found: ${filePath}`);
            }
        }

        console.log('\n\n--- Migration Summary ---');
        console.table(stats);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
