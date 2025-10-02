import pool from './db.js';

/**
 * Sleep utility for retry delays
 * @param {number} ms - milliseconds to sleep
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Gets a database client from the pool with error handling and retry logic
 * @param {number} maxRetries - maximum number of retry attempts (default: 3)
 * @returns {Promise<{client: import('pg').PoolClient | null, error: Response | null}>}
 */
export async function getDbClient(maxRetries = 3) {
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
    
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const client = await pool.connect();
            
            // If this was a retry, log success
            if (attempt > 1) {
                console.log(`✅ Database connection succeeded on attempt ${attempt}`);
            }
            
            return { client, error: null };
        } catch (err) {
            lastError = err;
            console.error(`❌ Failed to connect to database (attempt ${attempt}/${maxRetries}):`, err.message);
            
            // If not the last attempt, wait before retrying (exponential backoff)
            if (attempt < maxRetries) {
                const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5 seconds
                console.log(`⏳ Retrying in ${backoffDelay}ms...`);
                await sleep(backoffDelay);
            }
        }
    }
    
    // All retries failed
    console.error(`💥 All ${maxRetries} connection attempts failed`);
    return {
        client: null,
        error: new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to connect to database after multiple attempts.',
            details: lastError?.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        })
    };
}

/**
 * Execute a query with automatic retry logic
 * @param {Function} queryFn - async function that executes the query
 * @param {number} maxRetries - maximum number of retry attempts
 * @returns {Promise<any>} - query result
 */
export async function retryQuery(queryFn, maxRetries = 3) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await queryFn();
        } catch (err) {
            lastError = err;
            
            // Check if error is retryable
            const isRetryable = 
                err.code === 'ECONNREFUSED' || 
                err.code === 'ETIMEDOUT' ||
                err.code === '57P03' || // cannot_connect_now
                err.code === '53300' || // too_many_connections
                err.message.includes('Connection terminated');
            
            if (!isRetryable || attempt === maxRetries) {
                throw err;
            }
            
            const backoffDelay = Math.min(500 * Math.pow(2, attempt - 1), 3000);
            console.log(`⏳ Query failed, retrying in ${backoffDelay}ms... (${attempt}/${maxRetries})`);
            await sleep(backoffDelay);
        }
    }
    
    throw lastError;
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

