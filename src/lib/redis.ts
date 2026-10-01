import { Redis } from 'ioredis';

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');

// Shared Redis connection options for BullMQ
export const redisConnection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
};

// Singleton Redis instance for general use (caching, etc)
let redisInstance: Redis | null = null;

export function getRedisClient(): Redis {
    if (!redisInstance) {
        redisInstance = new Redis({
            host: REDIS_HOST,
            port: REDIS_PORT,
            maxRetriesPerRequest: null, // Required by BullMQ
        });

        redisInstance.on('error', (err) => {
            console.error('[Redis] Error:', err);
        });

        redisInstance.on('connect', () => {
            console.log('[Redis] Connected');
        });
    }
    return redisInstance;
}
