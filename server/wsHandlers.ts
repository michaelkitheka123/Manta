import WebSocket, { WebSocketServer } from 'ws';
import { query } from './db';
import { log } from './utils';
import { v4 as uuidv4 } from 'uuid';

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
        ws.on('message', async (msg) => {
            try {
                const data = JSON.parse(msg.toString());
                await handleMessage(ws, data);
            } catch (err) {
                console.error('WS parse error:', err);
            }
        });

        ws.on('close', () => {
            // Remove client from list on disconnect
            const index = clients.findIndex(c => c.ws === ws);
            if (index !== -1) {
                clients.splice(index, 1);
            }
        });
    });
}

async function handleMessage(ws: WebSocket, data: any) {
    switch (data.type) {
        case 'session:create':
            // Already created via REST, nothing needed
            break;
        case 'session:join':
            try {
                const { token, member } = data.payload;

                // Validation
                if (!token || !member) {
                    console.log('[WS JOIN FAILED] Missing required fields');
                    ws.send(JSON.stringify({
                        type: 'session:error',
                        payload: {
                            error: 'Missing required fields',
                            message: 'Token and member name are required'
                        }
                    }));
                    return;
                }

                // Check if session exists
                const sessionCheck = await query('SELECT id FROM sessions WHERE id = $1', [token]);
                if (sessionCheck.rows.length === 0) {
                    console.log(`[WS JOIN FAILED] Invalid token: ${token}`);
                    ws.send(JSON.stringify({
                        type: 'session:error',
                        payload: {
                            error: 'Session not found',
                            message: 'Invalid invite token. Please check and try again.'
                        }
                    }));
                    return;
                }

                clients.push({ ws, token, member });

                // Add member to DB
                await query(
                    `INSERT INTO members (id, session_id, name, role, status) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO NOTHING`,
                    [member, token, member, 'Member', 'online']
                );

                // Fetch current state
                const sessionRes = await query('SELECT id FROM sessions WHERE id = $1', [token]);
                const membersRes = await query('SELECT * FROM members WHERE session_id = $1', [token]);
                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [token]);

                // Broadcast update
                broadcast(token, { type: 'members:update', payload: membersRes.rows });

                // Send initial state to joiner
                ws.send(JSON.stringify({
                    type: 'session:joined',
                    payload: {
                        project: {
                            name: `Project ${token.substring(0, 6)}`, // Generate a name from token
                            token: token,
                            members: membersRes.rows,
                            tasks: tasksRes.rows
                        },
                        role: 'Member'
                    }
                }));

                console.log(`[WS JOIN SUCCESS] ${member} joined session ${token}`);
            } catch (err) {
                console.error('[WS JOIN ERROR]', err);
                ws.send(JSON.stringify({
                    type: 'session:error',
                    payload: {
                        error: 'Server error',
                        message: 'Failed to join session. Please try again later.'
                    }
                }));
            }
            break;

        case 'task:create':
            try {
                const task = data.payload;
                const taskId = task.id || uuidv4();

                await query(
                    `INSERT INTO tasks (id, session_id, title, status, assigned_to) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO NOTHING`,
                    [taskId, data.token, task.name, task.status || 'pending', task.assignedTo || null]
                );

                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [data.token]);
                broadcast(data.token, { type: 'tasks:update', payload: tasksRes.rows });
            } catch (err) {
                console.error('Error creating task:', err);
            }
            break;

        case 'task:assign':
            try {
                const { taskName, assignee } = data.payload;
                const taskId = uuidv4();

                await query(
                    `INSERT INTO tasks (id, session_id, title, status, assigned_to) 
                     VALUES ($1, $2, $3, $4, $5)`,
                    [taskId, data.token, taskName, 'pending', assignee]
                );

                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [data.token]);
                broadcast(data.token, { type: 'tasks:update', payload: tasksRes.rows });
            } catch (err) {
                console.error('Error assigning task:', err);
            }
            break;

        case 'task:approve':
            try {
                const { taskName } = data.payload;
                await query(
                    `UPDATE tasks SET status = 'complete' WHERE session_id = $1 AND title = $2`,
                    [data.token, taskName]
                );

                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [data.token]);
                broadcast(data.token, { type: 'tasks:update', payload: tasksRes.rows });
            } catch (err) {
                console.error('Error approving task:', err);
            }
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
        if (c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(JSON.stringify(message));
        }
    });
}
