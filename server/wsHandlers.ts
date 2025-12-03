import WebSocket, { WebSocketServer } from 'ws';
import { db } from './db';
import { log } from './utils';

interface Client {
    ws: WebSocket;
    token: string;
    member: string;
}

const clients: Client[] = [];

export function setupWebSocket(server: any) {
    const wss = new WebSocketServer({ server });
    log('WebSocket server running.');

    wss.on('connection', (ws) => {
        ws.on('message', (msg) => {
            try {
                const data = JSON.parse(msg.toString());
                handleMessage(ws, data);
            } catch (err) {
                console.error('WS parse error:', err);
            }
        });
    });
}

function handleMessage(ws: WebSocket, data: any) {
    switch (data.type) {
        case 'session:create':
            // Already created via REST, nothing needed
            break;
        case 'session:join':
            const { token, member } = data.payload;
            clients.push({ ws, token, member });
            db.projects[token].members.push(member);
            broadcast(token, { type: 'members:update', payload: db.projects[token].members });
            ws.send(JSON.stringify({ type: 'session:joined', payload: { project: db.projects[token], role: 'Member' } }));
            break;
        case 'task:assign':
            const { taskName, assignee } = data.payload;
            const project = db.projects[data.token];
            project.tasks.push({ name: taskName, assignee, status: 'pending' });
            broadcast(data.token, { type: 'tasks:update', payload: project.tasks });
            break;
        case 'task:approve':
            const task = db.projects[data.token].tasks.find((t: any) => t.name === data.payload.taskName);
            if (task) task.status = 'complete';
            broadcast(data.token, { type: 'tasks:update', payload: db.projects[data.token].tasks });
            break;
        case 'file:commit':
            // Optional: persist commit in memory or real DB
            break;
        case 'file:saved':
        case 'file:closed':
            break;
        default:
            console.log('Unknown WS message type:', data.type);
    }
}

function broadcast(token: string, message: any) {
    clients.filter((c) => c.token === token).forEach((c) => {
        c.ws.send(JSON.stringify(message));
    });
}
