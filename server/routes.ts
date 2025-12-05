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
    try {
        const { token, member } = req.body;

        // Validation
        if (!token || !member) {
            console.log('[JOIN FAILED] Missing required fields');
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Token and member name are required'
            });
        }

        // Check if session exists
        const session = await getProject(token);
        if (!session) {
            console.log(`[JOIN FAILED] Invalid token: ${token}`);
            return res.status(404).json({
                error: 'Session not found',
                message: 'Invalid invite token. Please check and try again.'
            });
        }

        // Add member to session
        await addMember(token, member);
        const project = await getProject(token);

        console.log(`[JOIN SUCCESS] ${member} joined session ${token}`);
        res.json({ project, role: 'Member' });

    } catch (err) {
        console.error('[JOIN ERROR]', err);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to join session. Please try again later.'
        });
    }
});

// Health check
router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

import axios from 'axios';

// GitHub OAuth Config
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

// Initiate GitHub Login
router.get('/auth/github', (req, res) => {
    const redirectUri = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=read:user`;
    res.redirect(redirectUri);
});

// Handle GitHub Callback
router.get('/auth/callback', async (req, res) => {
    const code = req.query.code as string;

    try {
        // Exchange code for token
        const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: GITHUB_CLIENT_ID,
            client_secret: GITHUB_CLIENT_SECRET,
            code
        }, { headers: { Accept: 'application/json' } });

        const accessToken = tokenRes.data.access_token;

        // Get User Info
        const userRes = await axios.get('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const user = userRes.data;

        // Redirect back to VS Code
        // Scheme: vscode://<publisher>.<extension>/auth?token=...&name=...&avatar=...
        // Publisher is 'kraken-labs' and extension is 'manta'
        const vsCodeUri = `vscode://kraken-labs.manta/auth?token=${accessToken}&id=${user.login}&name=${encodeURIComponent(user.name || user.login)}&avatar=${encodeURIComponent(user.avatar_url)}`;

        res.send(`
            <h1>Login Successful!</h1>
            <p>You can close this window. Opening VS Code...</p>
            <script>window.location.href = "${vsCodeUri}";</script>
        `);

    } catch (err) {
        console.error('Auth Error:', err);
        res.status(500).send('Authentication failed');
    }
});

export default router;
