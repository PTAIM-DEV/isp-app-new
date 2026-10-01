import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { settings, templates } = body;

        // 1. Save Settings
        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_min_interval' },
            create: { key: 'whatsapp_min_interval', value: String(settings.minInterval) },
            update: { value: String(settings.minInterval) }
        });

        await prisma.systemSetting.upsert({
            where: { key: 'whatsapp_random_interval_max' },
            create: { key: 'whatsapp_random_interval_max', value: String(settings.randomInterval) },
            update: { value: String(settings.randomInterval) }
        });

        // 2. Save Templates
        // Logic: Upsert existing, create new, delete missing?
        // Simpler: We receive the full state of active templates?
        // The client sends `templates` array containing all templates that should exist.
        // However, we need to handle deletions. 
        // Let's iterate through the input templates and upsert them.

        // Handling IDs: "new-..." are new. CUIDs are existing.

        // First, get all current IDs to find deletions
        const currentTemplates = await prisma.whatsAppTemplate.findMany({ select: { id: true } });
        const currentIds = currentTemplates.map(t => t.id);
        const inputIds = templates.filter((t: any) => !t.id.startsWith('new-')).map((t: any) => t.id);

        // Delete removed templates
        const idsToDelete = currentIds.filter(id => !inputIds.includes(id));
        if (idsToDelete.length > 0) {
            await prisma.whatsAppTemplate.deleteMany({
                where: { id: { in: idsToDelete } }
            });
        }

        // Upsert/Create
        for (const t of templates) {
            if (t.id.startsWith('new-')) {
                // Create
                await prisma.whatsAppTemplate.create({
                    data: {
                        name: 'WELCOME', // Default name for now, or make it generic
                        content: t.content,
                        isActive: t.isActive
                    }
                });
            } else {
                // Update
                await prisma.whatsAppTemplate.update({
                    where: { id: t.id },
                    data: {
                        content: t.content,
                        isActive: t.isActive
                    }
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving whatsapp settings:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
