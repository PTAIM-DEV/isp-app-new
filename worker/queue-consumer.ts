import { Worker, Job } from 'bullmq';
import { evolutionApi } from '../src/lib/evolution-api.js';
import { redisConnection } from '../src/lib/redis.js';

// Queue name (Must match the one used in Producer)
export const QUEUE_NAME = 'whatsapp-queue';

interface WhatsAppJobData {
    jid: string;
    text: string;
    priority?: number;
    media?: {
        type: 'image' | 'video' | 'document';
        url: string;
        caption?: string;
        fileName?: string;
    };
}

let worker: Worker<WhatsAppJobData> | null = null;

/**
 * Setup the BullMQ Worker to consume messages
 */
export function setupQueueConsumer() {
    if (worker) {
        console.log('[Queue Consumer] Worker already initialized');
        return;
    }

    console.log('[Queue Consumer] Initializing BullMQ Worker...');

    // Initialize Worker
    worker = new Worker<WhatsAppJobData>(
        QUEUE_NAME,
        async (job: Job<WhatsAppJobData>) => {
            const { jid, text, media } = job.data;

            console.log(`[Queue Consumer] Processing job ${job.id} for ${jid}`);

            try {
                if (media) {
                    await evolutionApi.sendMediaMessage(jid, media.type, media.url, media.caption, media.fileName);
                } else {
                    await evolutionApi.sendTextMessage(jid, text);
                }

                console.log(`[Queue Consumer] Job ${job.id} compeleted successfully`);
            } catch (error) {
                console.error(`[Queue Consumer] Job ${job.id} failed:`, error);
                throw error; // Let BullMQ handle retries
            }
        },
        {
            connection: redisConnection,
            concurrency: 1, // Strict requirement: Process 1 message at a time per worker instance
            limiter: {
                // Global Rate Limit
                max: 1,       // Max 1 message
                duration: 5000, // Every 5 seconds (Evolution API handles its own queue usually, but good to rate limit)
            },
            lockDuration: 30000, // Extend lock duration for long operations
        }
    );

    // Worker Event Listeners
    worker.on('ready', () => {
        console.log('[Queue Consumer] Worker is ready and waiting for jobs');
    });

    worker.on('failed', (job, err) => {
        console.error(`[Queue Consumer] Job ${job?.id} failed with error ${err.message}`);
    });

    worker.on('error', (err) => {
        console.error('[Queue Consumer] Worker error:', err);
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
        console.log('[Queue Consumer] Closing worker...');
        await worker?.close();
    });
}
