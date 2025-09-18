import pool, { initializeDb } from '../../lib/db.js';

export const prerender = false;

// Ensure the database is initialized on startup
initializeDb().catch(console.error);

export async function GET({ url }) {
    try {
        console.log('📦 Loading cart items from the database...');
        
        const client = await pool.connect();
        let responseData;

        try {
            const result = await client.query('SELECT * FROM cart_items ORDER BY created_at DESC');
            responseData = result.rows;
            console.log(`✅ Loaded ${responseData.length} cart items from the database.`);
        } finally {
            client.release();
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: responseData,
            timestamp: new Date().toISOString()
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to load cart items:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to retrieve cart items.',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
