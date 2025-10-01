import pool from './db.js';

/**
 * Gets a database client from the pool with error handling
 * @returns {Promise<{client: import('pg').PoolClient | null, error: Response | null}>}
 */
export async function getDbClient() {
    if (!pool) {
        console.error('❌ Database pool is not initialized. Check DATABASE_URL environment variable.');
        return {
            client: null,
            error: new Response(JSON.stringify({ 
                success: false, 
                error: 'Database connection not available. Please check server configuration.'
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        };
    }
    
    try {
        const client = await pool.connect();
        return { client, error: null };
    } catch (err) {
        console.error('❌ Failed to connect to database:', err);
        return {
            client: null,
            error: new Response(JSON.stringify({ 
                success: false, 
                error: 'Failed to connect to database.',
                details: err.message
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            })
        };
    }
}

/**
 * Safely releases a database client back to the pool
 * @param {import('pg').PoolClient | null | undefined} client
 */
export function safeRelease(client) {
    if (client && typeof client.release === 'function') {
        try {
            client.release();
        } catch (err) {
            console.error('⚠️ Error releasing database client:', err);
        }
    }
}

