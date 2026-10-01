import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { cookies } from 'next/headers';

// Dynamic import sharp to avoid build-time errors
let sharp: any;
try {
    sharp = require('sharp');
} catch (e) {
    console.warn('[Task Photo Upload] Sharp not available, compression will be skipped');
}

export const dynamic = 'force-dynamic';

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Maximum dimensions: 1920x1920
const MAX_WIDTH = 1920;
const MAX_HEIGHT = 1920;

// Quality for JPEG compression (0-100)
const JPEG_QUALITY = 85;

export async function POST(request: Request) {
    try {
        // Verify technician session
        const cookieStore = await cookies();
        const session = cookieStore.get('technician_session');

        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file uploaded' },
                { status: 400 }
            );
        }

        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
                { status: 400 }
            );
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'File must be an image' },
                { status: 400 }
            );
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `task-${timestamp}-${randomStr}.jpg`; // Always save as JPG after compression

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public/uploads/tasks');
        await mkdir(uploadDir, { recursive: true });

        // Compress and resize image using sharp (if available)
        let compressedBuffer: Buffer;
        if (sharp) {
            try {
                compressedBuffer = await sharp(buffer)
                    .resize(MAX_WIDTH, MAX_HEIGHT, {
                        fit: 'inside',
                        withoutEnlargement: true,
                    })
                    .jpeg({
                        quality: JPEG_QUALITY,
                        progressive: true,
                    })
                    .toBuffer();
            } catch (sharpError: any) {
                console.warn('[Task Photo Upload] Sharp compression failed, using original image:', sharpError.message);
                compressedBuffer = buffer;
            }
        } else {
            // Fallback: use original buffer if sharp is not available
            compressedBuffer = buffer;
        }

        // Save compressed file
        const filepath = path.join(uploadDir, filename);
        await writeFile(filepath, compressedBuffer);

        // Get original and compressed sizes for logging
        const originalSize = buffer.length;
        const compressedSize = compressedBuffer.length;
        const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);

        console.log(`Image compressed: ${(originalSize / 1024).toFixed(2)}KB -> ${(compressedSize / 1024).toFixed(2)}KB (${compressionRatio}% reduction)`);

        // Return public URL
        const url = `/uploads/tasks/${filename}`;

        return NextResponse.json({
            url,
            originalSize,
            compressedSize,
            compressionRatio: parseFloat(compressionRatio),
        });
    } catch (error: any) {
        console.error('Upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { status: 500 }
        );
    }
}

