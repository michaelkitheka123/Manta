import express from 'express';
import { createProject, getProject, addMember } from './db';

function generateToken(length = 12): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

const router = express.Router();

// Create new project
router.post('/project', async (req, res) => {
    const { name } = req.body;
    const token = generateToken();
    const project = await createProject(token);
    res.json({ project, token });
});

// Join project session
router.post('/join', async (req, res) => {
    const { token, member } = req.body;
    await addMember(token, member);
    const project = await getProject(token);
    res.json({ project, role: 'Member' });
});

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default router;
