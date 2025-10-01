import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

export async function GET({ url }) {
    const { client, error } = await getDbClient();
    if (error) return error;
    
    try {
        console.log('📦 Loading cart items from the database...');
        
        const result = await client.query('SELECT * FROM cart_items ORDER BY created_at DESC');
        const responseData = result.rows;
        console.log(`✅ Loaded ${responseData.length} cart items from the database.`);
        
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
    } finally {
        safeRelease(client);
    }
}
