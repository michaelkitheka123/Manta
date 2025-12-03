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
                lines_of_code INT DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id VARCHAR(50) PRIMARY KEY,
                session_id VARCHAR(50) REFERENCES sessions(id),
                title TEXT,
                status VARCHAR(50),
                assigned_to VARCHAR(50) REFERENCES members(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('Database initialized successfully');
    } catch (err) {
        console.error('Error initializing database:', err);
    }
};
