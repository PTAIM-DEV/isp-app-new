import { Redis } from 'ioredis';
var REDIS_HOST = process.env.REDIS_HOST || 'localhost';
var REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
// Shared Redis connection options for BullMQ
export var redisConnection = {
    host: REDIS_HOST,
    port: REDIS_PORT,
};
// Singleton Redis instance for general use (caching, etc)
var redisInstance = null;
export function getRedisClient() {
    if (!redisInstance) {
        redisInstance = new Redis({
            host: REDIS_HOST,
            port: REDIS_PORT,
            maxRetriesPerRequest: null, // Required by BullMQ
        });
        redisInstance.on('error', function (err) {
            console.error('[Redis] Error:', err);
        });
        redisInstance.on('connect', function () {
            console.log('[Redis] Connected');
        });
    }
    return redisInstance;
}
