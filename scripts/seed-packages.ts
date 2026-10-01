
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, '../data');
const CSV_FILES = [
    'Master_Data_Pelanggan_Merged - ACTIVE.csv',
    'Master_Data_Pelanggan_Merged - BLOCKED.csv'
];

async function seedPackages() {
    const packages = new Map<string, number>();

    // 1. Collect Unique Packages
    for (const file of CSV_FILES) {
        const filePath = path.join(DATA_DIR, file);
        if (!fs.existsSync(filePath)) continue;

        await new Promise<void>((resolve) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    const product = row.MASTER_PRODUCT?.trim();
                    const priceRaw = row.MASTER_PRICE?.replace(/[^0-9]/g, '');
                    const price = parseInt(priceRaw) || 0;

                    if (product) {
                        packages.set(product, price);
                    }
                })
                .on('end', resolve);
        });
    }

    console.log(`Found ${packages.size} unique packages. Seeding...`);

    let createdCount = 0;
    let updatedCount = 0;

    for (const [name, price] of packages.entries()) {
        // Extract Speed logic
        // Match "10 Mbps", "10Mbps", "100 Mbps", etc.
        const speedMatch = name.match(/(\d+)\s*Mbps/i);
        const speed = speedMatch ? `${speedMatch[1]} Mbps` : 'Unlimited';

        // Upsert
        const existing = await prisma.servicePackage.findFirst({
            where: { name: name }
        });

        if (existing) {
            await prisma.servicePackage.update({
                where: { id: existing.id },
                data: {
                    price: price,
                    speed: speed,
                    // Don't overwrite description if it looks custom? Maybe just keep it simple.
                }
            });
            process.stdout.write('.');
            updatedCount++;
        } else {
            await prisma.servicePackage.create({
                data: {
                    name: name,
                    price: price,
                    speed: speed,
                    description: `Package ${name}`,
                    features: JSON.stringify(['Internet Unlimited', 'Free Installation']),
                    isActive: true,
                    priceIncludesPPN: true,
                    isRecommended: false
                }
            });
            process.stdout.write('+');
            createdCount++;
        }
    }

    console.log('\n\n--- Package Seed Summary ---');
    console.log(`Created: ${createdCount}`);
    console.log(`Updated: ${updatedCount}`);
}

seedPackages()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
