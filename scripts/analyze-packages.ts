
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../data');
const CSV_FILES = [
    'Master_Data_Pelanggan_Merged - ACTIVE.csv',
    'Master_Data_Pelanggan_Merged - BLOCKED.csv'
];

async function analyzePackages() {
    const packages = new Map<string, number>();

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
                        // Store max price for the product (consistency check)
                        packages.set(product, price);
                    }
                })
                .on('end', resolve);
        });
    }

    console.log("--- UNIQUE PACKAGES FOUND ---");
    for (const [name, price] of packages.entries()) {
        console.log(`Product: "${name}" | Price: ${price}`);
    }
}

analyzePackages();
