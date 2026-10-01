
import { enqueueMessage } from '../src/lib/queue/producer.js';

async function main() {
    const targetJid = process.argv[2]; // Get JID from command line args

    if (!targetJid) {
        console.error('Usage: ts-node --esm scripts/test-queue.ts <jid>');
        console.error('Example: ts-node --esm scripts/test-queue.ts 628123456789@s.whatsapp.net');
        process.exit(1);
    }

    console.log(`Testing Redis Queue with JID: ${targetJid}`);

    try {
        // 1. Normal Priority
        await enqueueMessage(targetJid, 'Test message 1 (Normal Priority)', 'normal');

        // 2. High Priority (Should theoretically be processed sooner if queue is backed up)
        await enqueueMessage(targetJid, 'Test message 2 (High Priority)', 'high');

        // 3. Low Priority
        await enqueueMessage(targetJid, 'Test message 3 (Low Priority)', 'low');

        console.log('✅ Messages enqueued successfully!');
        console.log('Check your WhatsApp worker logs to see them being processed.');
        console.log('Note: Processing might be delayed by rate limiting (human emulation).');

        process.exit(0);
    } catch (error) {
        console.error('❌ Failed to enqueue messages:', error);
        process.exit(1);
    }
}

main();
