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
import axios from 'axios';
var EvolutionApiService = /** @class */ (function () {
    function EvolutionApiService() {
        this.config = {
            baseUrl: process.env.EVOLUTION_API_URL || 'http://localhost:8080',
            apiKey: process.env.EVOLUTION_API_KEY || '',
            instanceName: process.env.EVOLUTION_INSTANCE_NAME || 'isp-app',
        };
        console.log('[EvolutionAPI] Config:', {
            baseUrl: this.config.baseUrl,
            instanceName: this.config.instanceName,
            // Don't log full API key for security
            apiKeyPresent: !!this.config.apiKey
        });
        this.axios = axios.create({
            baseURL: this.config.baseUrl,
            headers: {
                'apikey': this.config.apiKey,
                'Content-Type': 'application/json',
            },
        });
    }
    /**
     * Send a text message
     */
    EvolutionApiService.prototype.sendTextMessage = function (jid, text) {
        return __awaiter(this, void 0, void 0, function () {
            var number, response, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        number = jid.replace('@s.whatsapp.net', '');
                        console.log("[EvolutionAPI] Sending text to ".concat(number, ":"), text.substring(0, 50) + (text.length > 50 ? '...' : ''));
                        return [4 /*yield*/, this.axios.post("/message/sendText/".concat(this.config.instanceName), {
                                number: number,
                                text: text,
                                linkPreview: false
                            })];
                    case 1:
                        response = _b.sent();
                        console.log("[EvolutionAPI] Send text success for ".concat(number));
                        return [2 /*return*/, response.data];
                    case 2:
                        error_1 = _b.sent();
                        console.error('[EvolutionAPI] Send Text Error:', ((_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data) || error_1.message);
                        throw error_1;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send a media message (image/video/document)
     */
    EvolutionApiService.prototype.sendMediaMessage = function (jid, mediaType, mediaUrl, caption, fileName) {
        return __awaiter(this, void 0, void 0, function () {
            var number, payload, response, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        number = jid.replace('@s.whatsapp.net', '');
                        console.log("[EvolutionAPI] Sending media (".concat(mediaType, ") to ").concat(number));
                        payload = {
                            number: number,
                            mediatype: mediaType,
                            media: mediaUrl,
                        };
                        if (caption)
                            payload.caption = caption;
                        if (fileName)
                            payload.fileName = fileName;
                        return [4 /*yield*/, this.axios.post("/message/sendMedia/".concat(this.config.instanceName), payload)];
                    case 1:
                        response = _b.sent();
                        console.log("[EvolutionAPI] Send media success for ".concat(number));
                        return [2 /*return*/, response.data];
                    case 2:
                        error_2 = _b.sent();
                        console.error('[EvolutionAPI] Send Media Error:', ((_a = error_2.response) === null || _a === void 0 ? void 0 : _a.data) || error_2.message);
                        throw error_2;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Send presence (typing/recording)
     */
    EvolutionApiService.prototype.sendPresence = function (jid, presence, delay) {
        return __awaiter(this, void 0, void 0, function () {
            var number, payload, response, error_3;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        number = jid.replace('@s.whatsapp.net', '');
                        console.log("[EvolutionAPI] Sending presence ".concat(presence, " to ").concat(number, " (delay: ").concat(delay, ")"));
                        payload = {
                            number: number,
                            presence: presence,
                        };
                        if (delay)
                            payload.delay = delay;
                        return [4 /*yield*/, this.axios.post("/chat/sendPresence/".concat(this.config.instanceName), payload)];
                    case 1:
                        response = _b.sent();
                        console.log("[EvolutionAPI] Send presence success for ".concat(number));
                        return [2 /*return*/, response.data];
                    case 2:
                        error_3 = _b.sent();
                        console.error('[EvolutionAPI] Send Presence Error:', ((_a = error_3.response) === null || _a === void 0 ? void 0 : _a.data) || error_3.message);
                        // Don't throw, just log. Presence is non-critical.
                        return [2 /*return*/, null];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Fetch Instance Status
     */
    EvolutionApiService.prototype.fetchInstanceStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_4;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.axios.get("/instance/connectionState/".concat(this.config.instanceName))];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_4 = _c.sent();
                        // If 404, instance might not exist
                        if (((_a = error_4.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                            return [2 /*return*/, { instance: { state: 'NOT_FOUND' } }];
                        }
                        // Only log non-404 errors to avoid spam
                        console.error('[EvolutionAPI] Fetch Status Error:', {
                            message: error_4.message,
                            code: error_4.code,
                            status: (_b = error_4.response) === null || _b === void 0 ? void 0 : _b.status
                        });
                        throw error_4;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Connect Instance (Get QR)
     */
    EvolutionApiService.prototype.connectInstance = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_5;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        console.log("[EvolutionAPI] Requesting connect for ".concat(this.config.instanceName));
                        return [4 /*yield*/, this.axios.get("/instance/connect/".concat(this.config.instanceName))];
                    case 1:
                        response = _b.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_5 = _b.sent();
                        console.error('[EvolutionAPI] Connect Error:', {
                            message: error_5.message,
                            code: error_5.code,
                            response: (_a = error_5.response) === null || _a === void 0 ? void 0 : _a.data
                        });
                        throw error_5;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Logout Instance
     */
    EvolutionApiService.prototype.logoutInstance = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_6;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.axios.delete("/instance/logout/".concat(this.config.instanceName))];
                    case 1:
                        response = _b.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_6 = _b.sent();
                        console.error('[EvolutionAPI] Logout Error:', ((_a = error_6.response) === null || _a === void 0 ? void 0 : _a.data) || error_6.message);
                        throw error_6;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Get webhook URL based on environment
     * Since Evolution API and isp-app are on the same Docker network,
     * use the container hostname directly
     */
    EvolutionApiService.prototype.getWebhookUrl = function () {
        // WEBHOOK_BASE_URL for explicit override
        // Default to isp-app:3000 since both containers are on same Docker network
        var baseUrl = process.env.WEBHOOK_BASE_URL || 'http://isp-app:3000';
        return "".concat(baseUrl, "/api/webhooks/evolution");
    };
    /**
     * Create Instance with per-instance webhook
     */
    EvolutionApiService.prototype.createInstance = function () {
        return __awaiter(this, void 0, void 0, function () {
            var webhookUrl, response, error_7;
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _c.trys.push([0, 2, , 5]);
                        console.log("[EvolutionAPI] Creating instance ".concat(this.config.instanceName));
                        webhookUrl = this.getWebhookUrl();
                        console.log("[EvolutionAPI] Webhook URL: ".concat(webhookUrl));
                        return [4 /*yield*/, this.axios.post('/instance/create', {
                                instanceName: this.config.instanceName,
                                qrcode: true,
                                integration: 'WHATSAPP-BAILEYS',
                                // Per-instance webhook configuration
                                webhook: {
                                    url: webhookUrl,
                                    byEvents: false,
                                    base64: true,
                                    events: [
                                        'MESSAGES_UPSERT',
                                        'CONNECTION_UPDATE',
                                        'QRCODE_UPDATED'
                                    ]
                                }
                            })];
                    case 1:
                        response = _c.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_7 = _c.sent();
                        if (!(((_a = error_7.response) === null || _a === void 0 ? void 0 : _a.status) === 403)) return [3 /*break*/, 4];
                        // Instance exists, try to set webhook anyway
                        return [4 /*yield*/, this.setWebhook().catch(function () { })];
                    case 3:
                        // Instance exists, try to set webhook anyway
                        _c.sent();
                        return [2 /*return*/, { instance: { state: 'already_exists' } }];
                    case 4:
                        console.error('[EvolutionAPI] Create Instance Error:', {
                            message: error_7.message,
                            code: error_7.code,
                            response: (_b = error_7.response) === null || _b === void 0 ? void 0 : _b.data
                        });
                        throw error_7;
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Set webhook for existing instance
     */
    EvolutionApiService.prototype.setWebhook = function () {
        return __awaiter(this, void 0, void 0, function () {
            var webhookUrl, response, error_8;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        webhookUrl = this.getWebhookUrl();
                        console.log("[EvolutionAPI] Setting webhook for ".concat(this.config.instanceName, ": ").concat(webhookUrl));
                        return [4 /*yield*/, this.axios.post("/webhook/set/".concat(this.config.instanceName), {
                                url: webhookUrl,
                                enabled: true,
                                events: [
                                    'MESSAGES_UPSERT',
                                    'CONNECTION_UPDATE',
                                    'QRCODE_UPDATED'
                                ],
                                webhookByEvents: false,
                                webhookBase64: true
                            })];
                    case 1:
                        response = _b.sent();
                        return [2 /*return*/, response.data];
                    case 2:
                        error_8 = _b.sent();
                        console.error('[EvolutionAPI] Set Webhook Error:', ((_a = error_8.response) === null || _a === void 0 ? void 0 : _a.data) || error_8.message);
                        throw error_8;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Connect with retry logic and backoff
     */
    EvolutionApiService.prototype.connectWithRetry = function () {
        return __awaiter(this, arguments, void 0, function (maxRetries) {
            var _loop_1, this_1, i, state_1;
            var _a, _b, _c;
            if (maxRetries === void 0) { maxRetries = 3; }
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _loop_1 = function (i) {
                            var status_1, _e, error_9;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0:
                                        _f.trys.push([0, 6, , 8]);
                                        return [4 /*yield*/, this_1.fetchInstanceStatus()];
                                    case 1:
                                        status_1 = _f.sent();
                                        if (!(((_a = status_1 === null || status_1 === void 0 ? void 0 : status_1.instance) === null || _a === void 0 ? void 0 : _a.state) === 'close' ||
                                            ((_b = status_1 === null || status_1 === void 0 ? void 0 : status_1.instance) === null || _b === void 0 ? void 0 : _b.state) === 'NOT_FOUND')) return [3 /*break*/, 3];
                                        _e = {};
                                        return [4 /*yield*/, this_1.connectInstance()];
                                    case 2: return [2 /*return*/, (_e.value = _f.sent(), _e)];
                                    case 3:
                                        if (!(((_c = status_1 === null || status_1 === void 0 ? void 0 : status_1.instance) === null || _c === void 0 ? void 0 : _c.state) === 'connecting')) return [3 /*break*/, 5];
                                        console.log("[EvolutionAPI] Already connecting, waiting... (attempt ".concat(i + 1, ")"));
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 2000); })];
                                    case 4:
                                        _f.sent();
                                        return [2 /*return*/, "continue"];
                                    case 5: return [2 /*return*/, { value: status_1 }];
                                    case 6:
                                        error_9 = _f.sent();
                                        console.error("[EvolutionAPI] Connect retry ".concat(i + 1, " failed:"), error_9);
                                        if (i === maxRetries - 1)
                                            throw error_9;
                                        return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, 1000 * (i + 1)); })];
                                    case 7:
                                        _f.sent();
                                        return [3 /*break*/, 8];
                                    case 8: return [2 /*return*/];
                                }
                            });
                        };
                        this_1 = this;
                        i = 0;
                        _d.label = 1;
                    case 1:
                        if (!(i < maxRetries)) return [3 /*break*/, 4];
                        return [5 /*yield**/, _loop_1(i)];
                    case 2:
                        state_1 = _d.sent();
                        if (typeof state_1 === "object")
                            return [2 /*return*/, state_1.value];
                        _d.label = 3;
                    case 3:
                        i++;
                        return [3 /*break*/, 1];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return EvolutionApiService;
}());
export { EvolutionApiService };
export var evolutionApi = new EvolutionApiService();
