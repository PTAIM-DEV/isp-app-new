import { prisma } from './prisma';
import { sendEmail } from './email';

/**
 * Send task assignment notification to technician via WhatsApp
 */
export async function sendTaskAssignmentNotification(
    technicianId: string,
    task: {
        id: string;
        type: 'INSTALLATION' | 'MAINTENANCE';
        scheduledDate: Date;
        customer: {
            name: string;
            phone: string;
            address?: string;
        };
        priority?: string;
        taskType?: string;
        locationNotes?: string;
    }
): Promise<boolean> {
    try {
        // Get technician info
        const technician = await prisma.user.findFirst({
            where: {
                id: technicianId,
                role: 'TECHNICIAN'
            }
        });

        if (!technician || !technician.phone) {
            console.warn(`[Task Notification] Technician ${technicianId} not found or has no phone number`);
            return false;
        }

        if (technician.status !== 'ACTIVE') {
            console.warn(`[Task Notification] Technician ${technician.name} is not active`);
            return false;
        }

        // Clean phone number
        let cleanPhone = technician.phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1);
        } else if (!cleanPhone.startsWith('62')) {
            cleanPhone = '62' + cleanPhone;
        }

        const jid = `${cleanPhone}@s.whatsapp.net`;

        // Format scheduled date
        const scheduledDateStr = new Date(task.scheduledDate).toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Build message
        const taskTypeLabel = task.type === 'INSTALLATION' ? 'Instalasi' : 'Maintenance';
        const priorityLabel = task.priority === 'URGENT' ? 'Mendesak' :
            task.priority === 'HIGH' ? 'Tinggi' :
                task.priority === 'NORMAL' ? 'Normal' : 'Rendah';

        let message = `🔔 *Tugas Baru Ditetapkan*\n\n`;
        message += `Halo ${technician.name},\n\n`;
        message += `Anda mendapat tugas baru:\n\n`;
        message += `📋 *Jenis:* ${taskTypeLabel}\n`;
        message += `👤 *Pelanggan:* ${task.customer.name}\n`;
        message += `📞 *Telepon:* ${task.customer.phone}\n`;
        if (task.customer.address) {
            message += `📍 *Alamat:* ${task.customer.address}\n`;
        }
        message += `📅 *Jadwal:* ${scheduledDateStr}\n`;
        message += `⚡ *Prioritas:* ${priorityLabel}\n`;
        if (task.locationNotes) {
            message += `\n📝 *Catatan Lokasi:*\n${task.locationNotes}\n`;
        }
        message += `\nSilakan login ke aplikasi teknisi untuk melihat detail lengkap dan mulai tugas.\n\n`;
        message += `Terima kasih!`;

        // Queue message via WhatsAppOutgoing
        await prisma.whatsAppOutgoing.create({
            data: {
                jid,
                content: message,
                status: 'PENDING',
            }
        });

        console.log(`[Task Notification] Task assignment notification queued for ${technician.name} (${technician.phone})`);

        // Send email notification if technician has email
        if (technician.email) {
            try {
                const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; color: #4F46E5; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔔 Tugas Baru Ditetapkan</h1>
        </div>
        <div class="content">
            <p>Halo <strong>${technician.name}</strong>,</p>
            <p>Anda mendapat tugas baru:</p>
            
            <div class="info-row">
                <span class="label">Jenis:</span> ${taskTypeLabel}
            </div>
            <div class="info-row">
                <span class="label">Pelanggan:</span> ${task.customer.name}
            </div>
            <div class="info-row">
                <span class="label">Telepon:</span> ${task.customer.phone}
            </div>
            ${task.customer.address ? `<div class="info-row"><span class="label">Alamat:</span> ${task.customer.address}</div>` : ''}
            <div class="info-row">
                <span class="label">Jadwal:</span> ${scheduledDateStr}
            </div>
            <div class="info-row">
                <span class="label">Prioritas:</span> ${priorityLabel}
            </div>
            ${task.locationNotes ? `<div class="info-row"><span class="label">Catatan Lokasi:</span><br>${task.locationNotes}</div>` : ''}
            
            <p style="margin-top: 20px;">Silakan login ke aplikasi teknisi untuk melihat detail lengkap dan mulai tugas.</p>
            
            <div class="footer">
                <p>Pesan ini dikirim otomatis. Mohon jangan membalas email ini.</p>
            </div>
        </div>
    </div>
</body>
</html>
                `;

                await sendEmail({
                    to: technician.email,
                    subject: `Tugas Baru: ${taskTypeLabel} - ${task.customer.name}`,
                    html: emailHtml,
                });

                console.log(`[Task Notification] Email sent to ${technician.email}`);
            } catch (emailError: any) {
                console.error('[Task Notification] Error sending email:', emailError);
                // Don't fail the whole function if email fails
            }
        }

        return true;
    } catch (error: any) {
        console.error('[Task Notification] Error sending task assignment notification:', error);
        return false;
    }
}

/**
 * Send task update notification to technician via WhatsApp
 */
export async function sendTaskUpdateNotification(
    technicianId: string,
    task: {
        id: string;
        type: 'INSTALLATION' | 'MAINTENANCE';
        scheduledDate?: Date | null;
        status: string;
        customer: {
            name: string;
        };
    },
    updateType: 'RESCHEDULED' | 'CANCELLED' | 'STATUS_CHANGED'
): Promise<boolean> {
    try {
        const technician = await prisma.user.findFirst({
            where: {
                id: technicianId,
                role: 'TECHNICIAN'
            }
        });

        if (!technician || !technician.phone) {
            return false;
        }

        let cleanPhone = technician.phone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '62' + cleanPhone.slice(1);
        } else if (!cleanPhone.startsWith('62')) {
            cleanPhone = '62' + cleanPhone;
        }

        const jid = `${cleanPhone}@s.whatsapp.net`;

        let message = '';
        if (updateType === 'RESCHEDULED' && task.scheduledDate) {
            const newDateStr = new Date(task.scheduledDate).toLocaleString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            message = `📅 *Jadwal Tugas Diubah*\n\n`;
            message += `Halo ${technician.name},\n\n`;
            message += `Jadwal tugas untuk pelanggan *${task.customer.name}* telah diubah menjadi:\n\n`;
            message += `📅 *Jadwal Baru:* ${newDateStr}\n\n`;
            message += `Silakan periksa aplikasi untuk detail lengkap.`;
        } else if (updateType === 'CANCELLED') {
            message = `❌ *Tugas Dibatalkan*\n\n`;
            message += `Halo ${technician.name},\n\n`;
            message += `Tugas untuk pelanggan *${task.customer.name}* telah dibatalkan.\n\n`;
            message += `Terima kasih.`;
        }

        if (message) {
            await prisma.whatsAppOutgoing.create({
                data: {
                    jid,
                    content: message,
                    status: 'PENDING',
                }
            });
            console.log(`[Task Notification] Task update notification queued for ${technician.name}`);

            // Send email notification if technician has email
            if (technician.email) {
                try {
                    let emailSubject = '';
                    let emailHtml = '';

                    if (updateType === 'RESCHEDULED' && task.scheduledDate) {
                        const newDateStr = new Date(task.scheduledDate).toLocaleString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                        emailSubject = `Jadwal Tugas Diubah - ${task.customer.name}`;
                        emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; color: #F59E0B; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Jadwal Tugas Diubah</h1>
        </div>
        <div class="content">
            <p>Halo <strong>${technician.name}</strong>,</p>
            <p>Jadwal tugas untuk pelanggan <strong>${task.customer.name}</strong> telah diubah menjadi:</p>
            <div class="info-row">
                <span class="label">Jadwal Baru:</span> ${newDateStr}
            </div>
            <p style="margin-top: 20px;">Silakan periksa aplikasi untuk detail lengkap.</p>
            <div class="footer">
                <p>Pesan ini dikirim otomatis. Mohon jangan membalas email ini.</p>
            </div>
        </div>
    </div>
</body>
</html>
                        `;
                    } else if (updateType === 'CANCELLED') {
                        emailSubject = `Tugas Dibatalkan - ${task.customer.name}`;
                        emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #EF4444; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Tugas Dibatalkan</h1>
        </div>
        <div class="content">
            <p>Halo <strong>${technician.name}</strong>,</p>
            <p>Tugas untuk pelanggan <strong>${task.customer.name}</strong> telah dibatalkan.</p>
            <p>Terima kasih.</p>
            <div class="footer">
                <p>Pesan ini dikirim otomatis. Mohon jangan membalas email ini.</p>
            </div>
        </div>
    </div>
</body>
</html>
                        `;
                    }

                    if (emailSubject && emailHtml) {
                        await sendEmail({
                            to: technician.email,
                            subject: emailSubject,
                            html: emailHtml,
                        });
                        console.log(`[Task Notification] Email sent to ${technician.email}`);
                    }
                } catch (emailError: any) {
                    console.error('[Task Notification] Error sending email:', emailError);
                    // Don't fail the whole function if email fails
                }
            }

            return true;
        }

        return false;
    } catch (error: any) {
        console.error('[Task Notification] Error sending task update notification:', error);
        return false;
    }
}

