import { prisma } from '@/lib/prisma';
import { SettingsTabs } from './settings-tabs';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const settings = await prisma.systemSetting.findMany();

    const settingsMap = settings.reduce((acc: Record<string, string>, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
    }, {} as Record<string, string>);

    // Fetch WhatsApp Templates
    const whatsappTemplates = await prisma.whatsAppTemplate.findMany({
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Pengaturan Sistem</h2>
            <SettingsTabs settingsMap={settingsMap} whatsappTemplates={whatsappTemplates} />
        </div>
    );
}
