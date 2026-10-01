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
import { Worker } from 'bullmq';
import { evolutionApi } from '../src/lib/evolution-api.js';
import { redisConnection } from '../src/lib/redis.js';
// Queue name (Must match the one used in Producer)
export var QUEUE_NAME = 'whatsapp-queue';
var worker = null;
/**
 * Setup the BullMQ Worker to consume messages
 */
export function setupQueueConsumer() {
    var _this = this;
    if (worker) {
        console.log('[Queue Consumer] Worker already initialized');
        return;
    }
    console.log('[Queue Consumer] Initializing BullMQ Worker...');
    // Initialize Worker
    worker = new Worker(QUEUE_NAME, function (job) { return __awaiter(_this, void 0, void 0, function () {
        var _a, jid, text, media, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = job.data, jid = _a.jid, text = _a.text, media = _a.media;
                    console.log("[Queue Consumer] Processing job ".concat(job.id, " for ").concat(jid));
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    if (!media) return [3 /*break*/, 3];
                    return [4 /*yield*/, evolutionApi.sendMediaMessage(jid, media.type, media.url, media.caption, media.fileName)];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, evolutionApi.sendTextMessage(jid, text)];
                case 4:
                    _b.sent();
                    _b.label = 5;
                case 5:
                    console.log("[Queue Consumer] Job ".concat(job.id, " compeleted successfully"));
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _b.sent();
                    console.error("[Queue Consumer] Job ".concat(job.id, " failed:"), error_1);
                    throw error_1; // Let BullMQ handle retries
                case 7: return [2 /*return*/];
            }
        });
    }); }, {
        connection: redisConnection,
        concurrency: 1, // Strict requirement: Process 1 message at a time per worker instance
        limiter: {
            // Global Rate Limit
            max: 1, // Max 1 message
            duration: 5000, // Every 5 seconds (Evolution API handles its own queue usually, but good to rate limit)
        },
        lockDuration: 30000, // Extend lock duration for long operations
    });
    // Worker Event Listeners
    worker.on('ready', function () {
        console.log('[Queue Consumer] Worker is ready and waiting for jobs');
    });
    worker.on('failed', function (job, err) {
        console.error("[Queue Consumer] Job ".concat(job === null || job === void 0 ? void 0 : job.id, " failed with error ").concat(err.message));
    });
    worker.on('error', function (err) {
        console.error('[Queue Consumer] Worker error:', err);
    });
    // Graceful shutdown
    process.on('SIGTERM', function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('[Queue Consumer] Closing worker...');
                    return [4 /*yield*/, (worker === null || worker === void 0 ? void 0 : worker.close())];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
}
