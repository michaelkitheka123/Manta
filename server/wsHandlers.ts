import WebSocket, { WebSocketServer } from 'ws';
import { query } from './db';
import { log } from './utils';
import { v4 as uuidv4 } from 'uuid';

interface Client {
    ws: WebSocket;
    token: string;
    member: string;
}

interface QueuedMessage {
    message: any;
    timestamp: number;
}

const clients: Client[] = [];
const messageQueues: Map<string, QueuedMessage[]> = new Map();
const MAX_QUEUE_SIZE = 50;

export function setupWebSocket(server: any) {
    const wss = new WebSocketServer({ server });
    log('WebSocket server running.');

    wss.on('connection', (ws) => {
        console.log('[WS CONNECTION] New WebSocket connection established');

        ws.on('message', async (msg) => {
            try {
                const data = JSON.parse(msg.toString());
                await handleMessage(ws, data);
            } catch (err) {
                console.error('[WS PARSE ERROR]', err);
            }
        });

        ws.on('close', () => {
            // Remove client from list on disconnect
            const index = clients.findIndex(c => c.ws === ws);
            if (index !== -1) {
                console.log(`[WS DISCONNECT] Client disconnected: ${clients[index].member} from session ${clients[index].token}`);
                clients.splice(index, 1);
            } else {
                console.log('[WS DISCONNECT] Unknown client disconnected');
            }
        });
    });
}

async function handleMessage(ws: WebSocket, data: any) {
    console.log(`[WS MESSAGE RECEIVED] Type: ${data.type}, Payload:`, JSON.stringify(data.payload || {}));

    switch (data.type) {
        case 'session:create':
            try {
                const { projectName, token, member } = data.payload;

                // Validation
                if (!projectName || !token || !member) {
                    console.log('[WS CREATE FAILED] Missing required fields');
                    ws.send(JSON.stringify({
                        type: 'session:error',
                        payload: {
                            error: 'Missing required fields',
                            message: 'Project name, token, and member name are required'
                        }
                    }));
                    return;
                }

                // Create session in database
                await query(
                    `INSERT INTO sessions (id, name, created_at) VALUES ($1, $2, NOW())
                     ON CONFLICT (id) DO NOTHING`,
                    [token, projectName]
                );

                // Add creator as first member with 'lead' role
                const memberId = `${token}_${member}`; // Unique ID per session
                await query(
                    `INSERT INTO members (id, session_id, name, role, status) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO UPDATE SET status = 'online'`,
                    [memberId, token, member, 'lead', 'online']
                );

                // Add client to clients array
                clients.push({ ws, token, member });

                // Fetch current state
                const membersRes = await query('SELECT * FROM members WHERE session_id = $1', [token]);
                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [token]);

                // Send success response to creator
                ws.send(JSON.stringify({
                    type: 'session:joined',
                    payload: {
                        project: {
                            name: projectName,
                            token: token,
                            members: membersRes.rows.map(dbToMember),
                            tasks: tasksRes.rows.map(dbToTask)
                        },
                        role: 'lead'
                    }
                }));

                console.log(`[WS CREATE SUCCESS] ${member} created project "${projectName}" with token ${token}`);
            } catch (err) {
                console.error('[WS CREATE ERROR]', err);
                ws.send(JSON.stringify({
                    type: 'session:error',
                    payload: {
                        error: 'Server error',
                        message: 'Failed to create project. Please try again later.'
                    }
                }));
            }
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
                const memberId = `${token}_${member}`; // Unique ID per session
                await query(
                    `INSERT INTO members (id, session_id, name, role, status) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO UPDATE SET status = 'online'`,
                    [memberId, token, member, 'Member', 'online']
                );

                // Fetch current state
                const sessionRes = await query('SELECT id, name FROM sessions WHERE id = $1', [token]);
                const membersRes = await query('SELECT * FROM members WHERE session_id = $1', [token]);
                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [token]);
                const reviewsRes = await query('SELECT * FROM reviews WHERE session_id = $1 ORDER BY created_at DESC', [token]);

                // Get the joining member's role from database
                const joiningMember = membersRes.rows.find((m: any) => m.name === member);
                const memberRole = joiningMember?.role || 'Implementer'; // Default to Implementer if not found

                // Broadcast update
                console.log(`[MEMBERS BROADCAST] Broadcasting to session ${token}:`, JSON.stringify(membersRes.rows));
                broadcast(token, { type: 'members:update', payload: membersRes.rows.map(dbToMember) });

                // Send initial state to joiner
                ws.send(JSON.stringify({
                    type: 'session:joined',
                    payload: {
                        project: {
                            name: sessionRes.rows[0].name || `Project ${token.substring(0, 6)}`, // Use DB name or fallback
                            token: token,
                            members: membersRes.rows.map(dbToMember),
                            tasks: tasksRes.rows.map(dbToTask),
                            reviews: reviewsRes.rows.map(dbToReview)
                        },
                        role: memberRole // Use actual role from database
                    }
                }));

                console.log(`[SESSION JOINED] Sending to ${member}, members count: ${membersRes.rows.length}, members:`, JSON.stringify(membersRes.rows));
                console.log(`[SESSION JOINED] Assigned role: ${memberRole} to ${member}`);
                console.log(`[WS JOIN SUCCESS] ${member} joined session ${token}`);

                // Replay any queued messages
                replayQueuedMessages(ws, token, member);
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

                // If task exists (by ID), update it. If not, insert.
                await query(
                    `INSERT INTO tasks (id, session_id, title, status, assigned_to) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO UPDATE 
                     SET title = EXCLUDED.title, status = EXCLUDED.status, assigned_to = EXCLUDED.assigned_to`,
                    [taskId, data.token, task.name, task.status || 'pending', task.assignee || null] // Fix: Use task.assignee
                );

                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [data.token]);
                broadcast(data.token, { type: 'tasks:update', payload: tasksRes.rows.map(dbToTask) });
                console.log(`[TASK CHORE] Created/Updated task "${task.name}" in ${data.token}`);
            } catch (err) {
                console.error('Error creating task:', err);
            }
            break;

        case 'task:assign':
            try {
                const { taskName, assignee } = data.payload;

                // Update existing task by name (or we should use ID ideally, but current client sends name/ID mixed)
                // The client sends { taskName, assignee } in assignTask, but in handleAssignTask it sends taskId. 
                // Let's support both or fix client. Client calls assignTask(task.name, member).
                // Ideally we should use ID. But let's support name for now as per schema.

                const memberId = `${data.token}_${assignee}`; // Construct ID to match FK
                await query(
                    `UPDATE tasks SET assigned_to = $1, status = 'pending' WHERE session_id = $2 AND title = $3`,
                    [memberId, data.token, taskName]
                );

                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [data.token]);
                broadcast(data.token, { type: 'tasks:update', payload: tasksRes.rows.map(dbToTask) });
                console.log(`[TASK ASSIGN] Assigned "${taskName}" to ${assignee} in ${data.token}`);
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
                broadcast(data.token, { type: 'tasks:update', payload: tasksRes.rows.map(dbToTask) });
            } catch (err) {
                console.error('Error approving task:', err);
            }
            break;

        case 'file:commit':
            // Optional: persist commit in memory or real DB
            break;

        case 'file:focus':
        case 'file:saved':
            try {
                const { filePath } = data.payload;
                // Update member's current file
                await query(
                    `UPDATE members SET current_file = $1, status = 'online' WHERE id = $2 AND session_id = $3`,
                    [filePath, data.member, data.token]
                );

                // Broadcast update
                const membersRes = await query('SELECT * FROM members WHERE session_id = $1', [data.token]);
                broadcast(data.token, { type: 'members:update', payload: membersRes.rows.map(dbToMember) });

                console.log(`[FILE ACTIVITY] ${data.member} focused/saved ${filePath}`);
            } catch (err) {
                console.error('Error handling file activity:', err);
            }
            break;

        case 'file:closed':
            try {
                // Clear current file
                await query(
                    `UPDATE members SET current_file = NULL, status = 'online' WHERE id = $1 AND session_id = $2`,
                    [data.member, data.token]
                );

                const membersRes = await query('SELECT * FROM members WHERE session_id = $1', [data.token]);
                broadcast(data.token, { type: 'members:update', payload: membersRes.rows.map(dbToMember) });
            } catch (err) {
                console.error('Error handling file:closed:', err);
            }
            break;

        case 'review:submit':
            try {
                const review = data.payload;
                await query(
                    `INSERT INTO reviews (id, session_id, author_id, file_path, content, ai_analysis, status) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [review.id, data.token, review.authorId, review.filePath, review.content, JSON.stringify(review.aiAnalysis), 'pending']
                );

                // Fetch updated list
                const reviewsRes = await query('SELECT * FROM reviews WHERE session_id = $1 ORDER BY created_at DESC', [data.token]);
                broadcast(data.token, { type: 'reviews:update', payload: reviewsRes.rows.map(dbToReview) });
                console.log(`[REVIEW] Submitted: ${review.id}`);
            } catch (err) {
                console.error('Error submitting review:', err);
            }
            break;

        case 'review:approve':
            try {
                const { reviewId } = data.payload;
                await query(`UPDATE reviews SET status = 'approved' WHERE id = $1`, [reviewId]);

                const reviewsRes = await query('SELECT * FROM reviews WHERE session_id = $1 ORDER BY created_at DESC', [data.token]);
                broadcast(data.token, { type: 'reviews:update', payload: reviewsRes.rows.map(dbToReview) });
                console.log(`[REVIEW] Approved: ${reviewId}`);
            } catch (err) {
                console.error('Error approving review:', err);
            }
            break;

        case 'review:decline':
            try {
                const { reviewId } = data.payload;
                await query(`UPDATE reviews SET status = 'declined' WHERE id = $1`, [reviewId]);

                const reviewsRes = await query('SELECT * FROM reviews WHERE session_id = $1 ORDER BY created_at DESC', [data.token]);
                broadcast(data.token, { type: 'reviews:update', payload: reviewsRes.rows.map(dbToReview) });
                console.log(`[REVIEW] Declined: ${reviewId}`);
            } catch (err) {
                console.error('Error declining review:', err);
            }
            break;

        default:
            console.log('Unknown WS message type:', data.type);
            break;
    }
}

function broadcast(token: string, message: any) {
    const sessionClients = clients.filter((c) => c.token === token);
    console.log(`[BROADCAST] Type: ${message.type}, Session: ${token}, Clients: ${sessionClients.length}, Message:`, JSON.stringify(message));

    sessionClients.forEach((c) => {
        if (c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(JSON.stringify(message));
            console.log(`[BROADCAST SENT] To client: ${c.member}`);
        } else {
            const queueKey = `${token}_${c.member}`;
            if (!messageQueues.has(queueKey)) {
                messageQueues.set(queueKey, []);
            }
            const queue = messageQueues.get(queueKey)!;
            if (queue.length < MAX_QUEUE_SIZE) {
                queue.push({ message, timestamp: Date.now() });
                console.log(`[BROADCAST QUEUED] For ${c.member}, queue: ${queue.length}, state: ${c.ws.readyState}`);
            } else {
                queue.shift();
                queue.push({ message, timestamp: Date.now() });
                console.log(`[BROADCAST QUEUED] Queue full for ${c.member}, size: ${queue.length}`);
            }
        }
    });
}

function replayQueuedMessages(ws: WebSocket, token: string, member: string) {
    const queueKey = `${token}_${member}`;
    const queue = messageQueues.get(queueKey);
    if (queue && queue.length > 0) {
        console.log(`[QUEUE REPLAY] Replaying ${queue.length} messages for ${member}`);
        queue.forEach((qm, i) => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(qm.message));
                console.log(`[QUEUE REPLAY] ${i + 1}/${queue.length} type: ${qm.message.type}`);
            }
        });
        messageQueues.delete(queueKey);
        console.log(`[QUEUE REPLAY] Cleared queue for ${member}`);
    }
}

// -----------------------------
// Data Mapping Helpers (Snake -> Camel)
// -----------------------------
function dbToTask(row: any): any {
    return {
        id: row.id,
        name: row.title,
        status: row.status,
        assignee: row.assigned_to ? row.assigned_to.split('_').slice(1).join('_') : undefined, // Strip prefix
        description: '' // DB doesn't have description yet
    };
}

function dbToMember(row: any): any {
    return {
        id: row.id,
        name: row.name,
        role: row.role,
        isOnline: row.status === 'online',
        currentFile: row.current_file,
        metrics: {
            commitsAccepted: row.commits_accepted || 0,
            tasksCompleted: row.tasks_completed || 0,
            linesOfCode: row.lines_of_code || 0
            // others...
        }
    };
}

function dbToReview(row: any): any {
    return {
        id: row.id,
        projectId: row.session_id,
        submittedBy: row.author_id, // assuming author_id stores name/id
        authorId: row.author_id,
        submittedByName: row.author_id, // fallback
        authorName: row.author_id, // fallback
        filePath: row.file_path,
        content: row.content,
        aiAnalysis: row.ai_analysis,
        status: row.status,
        submittedAt: row.created_at
    };
}
