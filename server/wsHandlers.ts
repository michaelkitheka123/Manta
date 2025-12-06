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
                await query(
                    `INSERT INTO members (id, session_id, name, role, status) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO NOTHING`,
                    [member, token, member, 'lead', 'online']
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
                            members: membersRes.rows,
                            tasks: tasksRes.rows
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
                await query(
                    `INSERT INTO members (id, session_id, name, role, status) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO NOTHING`,
                    [member, token, member, 'Member', 'online']
                );

                // Fetch current state
                const sessionRes = await query('SELECT id, name FROM sessions WHERE id = $1', [token]);
                const membersRes = await query('SELECT * FROM members WHERE session_id = $1', [token]);
                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [token]);
                const reviewsRes = await query('SELECT * FROM reviews WHERE session_id = $1 ORDER BY created_at DESC', [token]);

                // Broadcast update
                broadcast(token, { type: 'members:update', payload: membersRes.rows });

                // Send initial state to joiner
                ws.send(JSON.stringify({
                    type: 'session:joined',
                    payload: {
                        project: {
                            name: sessionRes.rows[0].name || `Project ${token.substring(0, 6)}`, // Use DB name or fallback
                            token: token,
                            members: membersRes.rows,
                            tasks: tasksRes.rows,
                            reviews: reviewsRes.rows
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

                // If task exists (by ID), update it. If not, insert.
                await query(
                    `INSERT INTO tasks (id, session_id, title, status, assigned_to) 
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (id) DO UPDATE 
                     SET title = EXCLUDED.title, status = EXCLUDED.status, assigned_to = EXCLUDED.assigned_to`,
                    [taskId, data.token, task.name, task.status || 'pending', task.assignee || null] // Fix: Use task.assignee
                );

                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [data.token]);
                broadcast(data.token, { type: 'tasks:update', payload: tasksRes.rows });
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

                await query(
                    `UPDATE tasks SET assigned_to = $1, status = 'pending' WHERE session_id = $2 AND title = $3`,
                    [assignee, data.token, taskName]
                );

                const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [data.token]);
                broadcast(data.token, { type: 'tasks:update', payload: tasksRes.rows });
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
                broadcast(data.token, { type: 'tasks:update', payload: tasksRes.rows });
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
                broadcast(data.token, { type: 'members:update', payload: membersRes.rows });

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
                broadcast(data.token, { type: 'members:update', payload: membersRes.rows });
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
                broadcast(data.token, { type: 'reviews:update', payload: reviewsRes.rows });
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
                broadcast(data.token, { type: 'reviews:update', payload: reviewsRes.rows });
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
                broadcast(data.token, { type: 'reviews:update', payload: reviewsRes.rows });
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
    clients.filter((c) => c.token === token).forEach((c) => {
        if (c.ws.readyState === WebSocket.OPEN) {
            c.ws.send(JSON.stringify(message));
        }
    });
}
