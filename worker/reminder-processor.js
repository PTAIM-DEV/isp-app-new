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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var API_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.API_URL || 'http://localhost:3000';
/**
 * Process scheduled reminders by calling the API endpoint
 * ⚠️ DISABLED - Jangan panggil endpoint ini untuk prevent duplicate
 */
function processDueReminders() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            console.log("[Reminder Processor] \u26A0\uFE0F Reminder processor DISABLED - Use server cron job instead");
            console.log("[Reminder Processor] Reminder processing should be handled by server cron job: /api/cron/payment-reminder-v2");
            return [2 /*return*/];
        });
    });
}
/**
 * Calculate milliseconds until next 6 AM GMT+7
 * GMT+7 = UTC+7, so 6 AM GMT+7 = 23:00 UTC previous day
 */
function getMsUntilNext6AMGMT7() {
    var now = new Date();
    var utcNow = new Date(now.getTime() + (now.getTimezoneOffset() * 60 * 1000));
    // 6 AM GMT+7 = 23:00 UTC previous day
    var nextRun = new Date(utcNow);
    nextRun.setUTCHours(23, 0, 0, 0);
    // If already past 23:00 UTC today, schedule for tomorrow
    if (utcNow.getUTCHours() >= 23) {
        nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    }
    var msUntilNext = nextRun.getTime() - utcNow.getTime();
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
if (import.meta.url === "file://".concat(process.argv[1])) {
    startReminderProcessor();
}
