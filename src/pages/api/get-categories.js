import pool from '../../lib/db.js';

export const prerender = false;

export async function GET() {
    // Check if database pool is available
    if (!pool) {
        console.error('Database pool not initialized');
        return new Response(JSON.stringify({
            success: true,
            data: [],
            message: 'Database not connected - using fallback empty categories'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const client = await pool.connect();
    try {
        // Check if product_categories table exists
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'product_categories'
            );
        `);

        if (!tableExists.rows[0].exists) {
            return new Response(JSON.stringify({
                success: true,
                data: [],
                message: 'Categories table does not exist'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get all categories for default restaurant
        const restaurantId = 'default';
        const result = await client.query('SELECT * FROM product_categories WHERE restaurant_id = $1 ORDER BY name', [restaurantId]);
        
        return new Response(JSON.stringify({
            success: true,
            data: result.rows
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error getting categories:', error);
        return new Response(JSON.stringify({
            success: true,
            data: [],
            error: error.message,
            message: 'Database error - using fallback empty categories'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
