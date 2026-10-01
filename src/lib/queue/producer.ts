import { Queue } from 'bullmq';
import { redisConnection } from '../../lib/redis.js';

// Queue name (Must match consumer)
const QUEUE_NAME = 'whatsapp-queue';

// Singleton Queue Instance
let queueInstance: Queue | null = null;

export function getQueue(): Queue {
    if (!queueInstance) {
        queueInstance = new Queue(QUEUE_NAME, {
            connection: redisConnection,
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000,
                },
                removeOnComplete: true,
                removeOnFail: false, // Keep failed jobs for inspection
            }
        });
    }
    return queueInstance;
}

/**
 * Enqueue a message to be sent via WhatsApp
 * @param jid - WhatsApp JID (e.g., 628123456789@s.whatsapp.net)
 * @param text - Message content
 * @param priority - Optional priority (default: normal). Lower number = worse priority? No, BullMQ uses priority option differently?
 * Actually BullMQ doesn't natively support priority queues unless using 'priority' option where lower number = higher priority.
 */
export async function enqueueMessage(jid: string, text: string, priority: 'high' | 'normal' | 'low' = 'normal') {
    const queue = getQueue();

    // Map priority string to number (1 = Highest)
    const priorityMap = {
        'high': 1,
        'normal': 10,
        'low': 20
    };

    const jobName = `send-message-${Date.now()}`;

    await queue.add(jobName, {
        jid,
        text
    }, {
        priority: priorityMap[priority],
        timestamp: Date.now() // For FIFO within priority
    });

    console.log(`[Queue Producer] Enqueued message to ${jid} (Priority: ${priority})`);
}
