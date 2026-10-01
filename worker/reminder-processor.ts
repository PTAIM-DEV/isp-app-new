/**
 * ⚠️ DEPRECATED: Reminder Processor Worker - DISABLED
 * 
 * Worker ini sudah dinonaktifkan karena:
 * 1. Menyebabkan duplicate execution dengan cron job server
 * 2. Cron job server sudah handle reminder processing
 * 3. Worker dan cron berjalan bersamaan menyebabkan spam
 * 
 * Gunakan cron job server saja untuk process reminders
 */

const API_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.API_URL || 'http://localhost:3000';

/**
 * Process scheduled reminders by calling the API endpoint
 * ⚠️ DISABLED - Jangan panggil endpoint ini untuk prevent duplicate
 */
async function processDueReminders() {
    console.log(`[Reminder Processor] ⚠️ Reminder processor DISABLED - Use server cron job instead`);
    console.log(`[Reminder Processor] Reminder processing should be handled by server cron job: /api/cron/payment-reminder-v2`);
    return;
    
    // DISABLED CODE - Jangan uncomment
    // try {
    //     console.log(`[Reminder Processor] Processing reminders at ${new Date().toISOString()}`);
    //     const response = await fetch(`${API_URL}/api/cron/payment-reminder-v2`, {
    //         method: 'GET',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //     });
    //
    //     if (!response.ok) {
    //         throw new Error(`API returned ${response.status}: ${response.statusText}`);
    //     }
    //
    //     const result = await response.json();
    //     console.log(`[Reminder Processor] Processed reminders:`, result);
    // } catch (error: any) {
    //     const errorMsg = error instanceof Error ? error.message : String(error);
    //     console.error('[Reminder Processor] Error processing reminders:', errorMsg);
    // }
}

/**
 * Calculate milliseconds until next 6 AM GMT+7
 * GMT+7 = UTC+7, so 6 AM GMT+7 = 23:00 UTC previous day
 */
function getMsUntilNext6AMGMT7(): number {
    const now = new Date();
    const utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000));
    
    // 6 AM GMT+7 = 23:00 UTC previous day
    const nextRun = new Date(utcNow);
    nextRun.setUTCHours(23, 0, 0, 0);
    
    // If already past 23:00 UTC today, schedule for tomorrow
    if (utcNow.getUTCHours() >= 23) {
        nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }
    
    const msUntilNext = nextRun.getTime() - utcNow.getTime();
    return msUntilNext;
}

/**
 * Start the reminder processor worker
 * ⚠️ DISABLED - Worker tidak akan menjalankan reminder processing
 * Gunakan server cron job saja untuk prevent duplicate execution
 */
export function startReminderProcessor() {
    console.log('[Reminder Processor] ⚠️ Reminder processor worker DISABLED');
    console.log('[Reminder Processor] Reminder processing should be handled by server cron job only');
    console.log('[Reminder Processor] Server cron: /api/cron/payment-reminder-v2');
    return; // Exit immediately, don't schedule anything
    
    // DISABLED CODE - Jangan uncomment
    // console.log('[Reminder Processor] Starting reminder processor worker...');
    // console.log(`[Reminder Processor] Current time: ${new Date().toISOString()}`);
    // 
    // function scheduleNextRun() {
    //     const msUntilNext = getMsUntilNext6AMGMT7();
    //     const nextRunDate = new Date(Date.now() + msUntilNext);
    //     
    //     console.log(`[Reminder Processor] Next run scheduled at: ${nextRunDate.toISOString()}`);
    //     
    //     setTimeout(() => {
    //         processDueReminders();
    //         scheduleNextRun();
    //     }, msUntilNext);
    // }
    // 
    // scheduleNextRun();
}

// If running as standalone script
if (import.meta.url === `file://${process.argv[1]}`) {
    startReminderProcessor();
}

