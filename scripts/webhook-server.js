#!/usr/bin/env node
/**
 * Simple GitHub Webhook Server untuk Auto-Deploy
 * 
 * Setup:
 * 1. npm install express crypto
 * 2. chmod +x scripts/webhook-server.js
 * 3. pm2 start scripts/webhook-server.js --name webhook-deploy
 * 
 * GitHub Webhook Config:
 * - URL: http://your-server:9000/webhook
 * - Secret: (set di WEBHOOK_SECRET env variable)
 * - Events: push
 */

const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');
const path = require('path');

const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'your-secret-key-change-this';
const DEPLOY_SCRIPT = process.env.DEPLOY_SCRIPT || '/home/gastra/projects/isp-app/webhook-deploy.sh';
const BRANCH = process.env.GITHUB_BRANCH || 'main';

function verifySignature(payload, signature) {
    const hmac = crypto.createHmac('sha256', SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

function deploy() {
    console.log(`[${new Date().toISOString()}] Starting deployment...`);
    
    exec(`bash ${DEPLOY_SCRIPT}`, (error, stdout, stderr) => {
        if (error) {
            console.error(`[${new Date().toISOString()}] Deployment error:`, error);
            return;
        }
        console.log(`[${new Date().toISOString()}] Deployment output:`, stdout);
        if (stderr) {
            console.error(`[${new Date().toISOString()}] Deployment stderr:`, stderr);
        }
    });
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            const signature = req.headers['x-hub-signature-256'];
            
            if (!signature) {
                console.log(`[${new Date().toISOString()}] No signature found`);
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'No signature' }));
                return;
            }
            
            if (!verifySignature(body, signature)) {
                console.log(`[${new Date().toISOString()}] Invalid signature`);
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid signature' }));
                return;
            }
            
            try {
                const payload = JSON.parse(body);
                
                // Check if push is to the correct branch
                if (payload.ref === `refs/heads/${BRANCH}`) {
                    console.log(`[${new Date().toISOString()}] Push detected to ${BRANCH} branch`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Deployment triggered' }));
                    deploy();
                } else {
                    console.log(`[${new Date().toISOString()}] Push to ${payload.ref}, ignoring`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Ignored - wrong branch' }));
                }
            } catch (error) {
                console.error(`[${new Date().toISOString()}] Error parsing payload:`, error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid payload' }));
            }
        });
    } else if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

server.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] Webhook server listening on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] Branch: ${BRANCH}`);
    console.log(`[${new Date().toISOString()}] Deploy script: ${DEPLOY_SCRIPT}`);
});

