import { Pool } from 'pg';

// Use DATABASE_URL from environment or fallback to local default
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/manta';

const pool = new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
});

export const query = (text: string, params?: any[]) => pool.query(text, params);

export const initDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(50) PRIMARY KEY,
                name TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS members (
                id VARCHAR(50) PRIMARY KEY,
                session_id VARCHAR(50) REFERENCES sessions(id),
                name VARCHAR(100),
                role VARCHAR(50),
                status VARCHAR(50),
                commits_accepted INT DEFAULT 0,
                tasks_completed INT DEFAULT 0,
                lines_of_code INT DEFAULT 0,
                avatar_url TEXT,
                github_id VARCHAR(50),
                current_file TEXT
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id VARCHAR(50) PRIMARY KEY,
                session_id VARCHAR(50) REFERENCES sessions(id),
                title TEXT,
                status VARCHAR(50),
                assigned_to VARCHAR(50) REFERENCES members(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS reviews (
                id VARCHAR(50) PRIMARY KEY,
                session_id VARCHAR(50) REFERENCES sessions(id),
                author_id VARCHAR(50),
                file_path TEXT,
                content TEXT,
                ai_analysis JSONB,
                status VARCHAR(20) DEFAULT 'pending', 
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Migrations to add columns if they don't exist
        try {
            await pool.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS name TEXT;`);
            await pool.query(`ALTER TABLE members ADD COLUMN IF NOT EXISTS current_file TEXT;`);
        } catch (e) {
            console.log('Migration note: ', e);
        }

        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};

// Helper functions for routes.ts
export const createProject = async (id: string, name?: string) => {
    // Note: wsHandlers usually handles this, this helper is for REST routes.ts
    await query('INSERT INTO sessions (id, name) VALUES ($1, $2)', [id, name || null]);
    return { id, name, members: [], tasks: [] };
};

export const getProject = async (id: string) => {
    const sessionRes = await query('SELECT id, name FROM sessions WHERE id = $1', [id]);
    if (sessionRes.rows.length === 0) return null;

    const membersRes = await query('SELECT * FROM members WHERE session_id = $1', [id]);
    const tasksRes = await query('SELECT * FROM tasks WHERE session_id = $1', [id]);

    return {
        id,
        name: sessionRes.rows[0].name,
        members: membersRes.rows,
        tasks: tasksRes.rows
    };
};

export const addMember = async (sessionId: string, memberName: string, avatarUrl?: string, githubId?: string) => {
    await query(
        `INSERT INTO members (id, session_id, name, role, status, avatar_url, github_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET status = 'online'`,
        [memberName, sessionId, memberName, 'Member', 'online', avatarUrl || null, githubId || null]
    );
};
