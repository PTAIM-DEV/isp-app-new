import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request) {
    try {
        console.log('[Technician Photo Upload] Request received');
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        console.log('[Technician Photo Upload] File received:', file ? `${file.name} (${file.size} bytes)` : 'No file');

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
        console.log('[Technician Photo Upload] Buffer created:', buffer.length, 'bytes');

        // Create unique filename with original extension
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const originalName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
        const originalExt = originalName.split('.').pop()?.toLowerCase() || 'jpg';
        const filename = `technician-${timestamp}-${randomStr}.${originalExt}`;

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public/uploads/technicians');
        console.log('[Technician Photo Upload] Upload directory:', uploadDir);
        try {
            await mkdir(uploadDir, { recursive: true });
            console.log('[Technician Photo Upload] Directory ensured');
        } catch (mkdirError: any) {
            console.error('[Technician Photo Upload] Mkdir error:', mkdirError);
            return NextResponse.json(
                { error: `Gagal membuat direktori: ${mkdirError.message}` },
                { status: 500 }
            );
        }

        // Save file without compression
        const filepath = path.join(uploadDir, filename);
        console.log('[Technician Photo Upload] Saving to:', filepath);
        try {
            await writeFile(filepath, buffer);
            console.log('[Technician Photo Upload] File saved successfully');
        } catch (writeError: any) {
            console.error('[Technician Photo Upload] Write file error:', writeError);
            return NextResponse.json(
                { error: `Gagal menyimpan file: ${writeError.message}` },
                { status: 500 }
            );
        }

        // Return public URL
        const url = `/uploads/technicians/${filename}`;
        const fileSize = buffer.length;

        console.log('[Technician Photo Upload] Success:', url, `(${(fileSize / 1024).toFixed(2)}KB)`);
        return NextResponse.json({
            url,
            originalSize: fileSize,
        }, {
            headers: {
                'Content-Type': 'application/json',
            },
        });
    } catch (error: any) {
        console.error('[Technician Photo Upload] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Upload failed' },
            { 
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );
    }
}

