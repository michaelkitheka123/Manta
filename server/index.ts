import express from 'express';
import http from 'http';
import bodyParser from 'body-parser';
import { SERVER_PORT } from './config';
import router from './routes';
import { setupWebSocket } from './wsHandlers';
import { log } from './utils';

const app = express();
app.use(bodyParser.json());
app.use('/api', router);

const server = http.createServer(app);
setupWebSocket(server);

const HOST = process.env.HOST || '0.0.0.0';

server.listen(SERVER_PORT, HOST, () => {
    const env = process.env.NODE_ENV || 'development';
    log(`Manta backend server running in ${env} mode`);
    log(`Server URL: ${env === 'production' ? 'https://your-domain.com' : `http://localhost:${SERVER_PORT}`}`);
});
