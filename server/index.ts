import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import { SERVER_PORT } from './config';
import router from './routes';
import { setupWebSocket } from './wsHandlers';
import { log } from './utils';

import { initDB } from './db';

const app = express();
app.use(bodyParser.json());
// Mount routes at root level (OAuth needs /auth/github, not /api/auth/github)
app.use('/', router);

const server = http.createServer(app);
setupWebSocket(server);

const HOST = process.env.HOST || '0.0.0.0';

// Initialize DB then start server
initDB().then(() => {
    server.listen(SERVER_PORT, HOST, () => {
        const env = process.env.NODE_ENV || 'development';
        log(`Manta backend server running in ${env} mode`);
        log(`Server URL: ${env === 'production' ? 'https://your-domain.com' : `http://localhost:${SERVER_PORT}`}`);
    });
});
