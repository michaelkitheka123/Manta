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
router.post('/project', (req, res) => {
    const { name } = req.body;
    const token = generateToken();
    const project = createProject(name, token);
    res.json({ project, token });
});

// Join project session
router.post('/join', (req, res) => {
    const { token, member } = req.body;
    addMember(token, member);
    const project = getProject(token);
    res.json({ project, role: 'Member' });
});

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default router;
