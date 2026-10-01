import axios, { AxiosInstance } from 'axios';
import { prisma } from '@/lib/prisma';

interface EvolutionApiConfig {
    baseUrl: string;
    apiKey: string;
    instanceName: string;
}

export class EvolutionApiService {
    private axios: AxiosInstance;
    private config: EvolutionApiConfig;
    private cachedInstanceName: string | null = null;
    private lastCacheTime: number = 0;
    private CACHE_TTL = 30000; // 30 seconds

    constructor() {
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
     * Get instance name from DB or Fallback
     */
    private async getInstanceName(): Promise<string> {
        // Return cached if fresh
        if (this.cachedInstanceName && (Date.now() - this.lastCacheTime < this.CACHE_TTL)) {
            return this.cachedInstanceName;
        }

        try {
            const setting = await prisma.systemSetting.findUnique({
                where: { key: 'evolution_instance_name' }
            });

            if (setting?.value) {
                this.cachedInstanceName = setting.value;
                this.lastCacheTime = Date.now();
                return setting.value;
            }
        } catch (error) {
            console.warn('[EvolutionAPI] Failed to fetch instance name from DB, using fallback:', error);
        }

        return this.config.instanceName; // Fallback
    }

    /**
     * Send a text message
     */
    async sendTextMessage(jid: string, text: string) {
        try {
            const instanceName = await this.getInstanceName();
            const number = jid.replace('@s.whatsapp.net', '');

            console.log(`[EvolutionAPI] Sending text to ${number} via ${instanceName}:`, text.substring(0, 50) + (text.length > 50 ? '...' : ''));

            const response = await this.axios.post(`/message/sendText/${instanceName}`, {
                number: number,
                text: text,
                linkPreview: false
            });

            console.log(`[EvolutionAPI] Send text success for ${number}`);
            return response.data;
        } catch (error: any) {
            console.error('[EvolutionAPI] Send Text Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Send a media message (image/video/document)
     */
    async sendMediaMessage(jid: string, mediaType: 'image' | 'video' | 'document', mediaUrl: string, caption?: string, fileName?: string) {
        try {
            const instanceName = await this.getInstanceName();
            const number = jid.replace('@s.whatsapp.net', '');

            console.log(`[EvolutionAPI] Sending media (${mediaType}) to ${number} via ${instanceName}`);

            const payload: any = {
                number: number,
                mediatype: mediaType,
                media: mediaUrl,
            };

            if (caption) payload.caption = caption;
            if (fileName) payload.fileName = fileName;

            const response = await this.axios.post(`/message/sendMedia/${instanceName}`, payload);
            console.log(`[EvolutionAPI] Send media success for ${number}`);
            return response.data;
        } catch (error: any) {
            console.error('[EvolutionAPI] Send Media Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Send presence (typing/recording)
     */
    async sendPresence(jid: string, presence: 'composing' | 'recording' | 'available' | 'unavailable', delay?: number) {
        try {
            const instanceName = await this.getInstanceName();
            const number = jid.replace('@s.whatsapp.net', '');
            const finalDelay = delay || 2000;

            // console.log(`[EvolutionAPI] Sending presence ${presence} to ${number}`);

            const payload: any = {
                number: number,
                presence: presence,
                delay: finalDelay
            };

            const response = await this.axios.post(`/chat/sendPresence/${instanceName}`, payload);
            return response.data;
        } catch (error: any) {
            console.error('[EvolutionAPI] Send Presence Warning:', error.response?.data || error.message);
            return null;
        }
    }

    /**
     * Fetch Instance Status
     */
    async fetchInstanceStatus() {
        try {
            const instanceName = await this.getInstanceName();
            // console.log(`[EvolutionAPI] Fetching status for ${instanceName}`);
            const response = await this.axios.get(`/instance/connectionState/${instanceName}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return { instance: { state: 'NOT_FOUND' } };
            }
            console.error('[EvolutionAPI] Fetch Status Error:', {
                message: error.message,
                status: error.response?.status
            });
            throw error;
        }
    }

    /**
     * Connect Instance (Get QR)
     */
    async connectInstance() {
        try {
            const instanceName = await this.getInstanceName();
            console.log(`[EvolutionAPI] Requesting connect for ${instanceName}`);
            const response = await this.axios.get(`/instance/connect/${instanceName}`);
            return response.data;
        } catch (error: any) {
            console.error('[EvolutionAPI] Connect Error:', {
                message: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Logout Instance
     */
    async logoutInstance() {
        try {
            const instanceName = await this.getInstanceName();
            const response = await this.axios.delete(`/instance/logout/${instanceName}`);
            return response.data;
        } catch (error: any) {
            console.error('[EvolutionAPI] Logout Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Delete Instance (Completely remove config)
     */
    async deleteInstance() {
        try {
            const instanceName = await this.getInstanceName();
            console.log(`[EvolutionAPI] Deleting instance ${instanceName}`);
            const response = await this.axios.delete(`/instance/delete/${instanceName}`);
            return response.data;
        } catch (error: any) {
            console.error('[EvolutionAPI] Delete Instance Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Get webhook URL based on environment
     */
    private getWebhookUrl(): string {
        const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://isp-app:3000';
        return `${baseUrl}/api/webhooks/evolution`;
    }

    /**
     * Create Instance with per-instance webhook
     */
    async createInstance() {
        try {
            const instanceName = await this.getInstanceName();
            console.log(`[EvolutionAPI] Creating instance ${instanceName}`);

            const webhookUrl = this.getWebhookUrl();
            console.log(`[EvolutionAPI] Webhook URL: ${webhookUrl}`);

            const response = await this.axios.post('/instance/create', {
                instanceName: instanceName,
                qrcode: true,
                integration: 'WHATSAPP-BAILEYS',
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
            });
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 403) {
                await this.setWebhook().catch(() => { });
                return { instance: { state: 'already_exists' } };
            }
            console.error('[EvolutionAPI] Create Instance Error:', {
                message: error.message,
                response: error.response?.data
            });
            throw error;
        }
    }

    /**
     * Set webhook for existing instance
     */
    async setWebhook() {
        try {
            const instanceName = await this.getInstanceName();
            const webhookUrl = this.getWebhookUrl();
            console.log(`[EvolutionAPI] Setting webhook for ${instanceName}: ${webhookUrl}`);

            const response = await this.axios.post(`/webhook/set/${instanceName}`, {
                url: webhookUrl,
                enabled: true,
                events: [
                    'MESSAGES_UPSERT',
                    'CONNECTION_UPDATE',
                    'QRCODE_UPDATED'
                ],
                webhookByEvents: false,
                webhookBase64: true
            });
            return response.data;
        } catch (error: any) {
            console.error('[EvolutionAPI] Set Webhook Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Connect with retry logic and backoff
     */
    async connectWithRetry(maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const status = await this.fetchInstanceStatus();

                if (status?.instance?.state === 'close' ||
                    status?.instance?.state === 'NOT_FOUND') {
                    return await this.connectInstance();
                }

                if (status?.instance?.state === 'connecting') {
                    console.log(`[EvolutionAPI] Already connecting, waiting... (attempt ${i + 1})`);
                    await new Promise(r => setTimeout(r, 2000));
                    continue;
                }

                return status;
            } catch (error) {
                console.error(`[EvolutionAPI] Connect retry ${i + 1} failed:`, error);
                if (i === maxRetries - 1) throw error;
                await new Promise(r => setTimeout(r, 1000 * (i + 1)));
            }
        }
    }
}

export const evolutionApi = new EvolutionApiService();

