import pool from '../../lib/db.js';

export const prerender = false;

export async function GET() {
    const client = await pool.connect();
    try {
        // Check if categories table exists
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'categories'
            );
        `);

        if (!tableExists.rows[0].exists) {
            return new Response(JSON.stringify({
                success: true,
                categories: [],
                message: 'Categories table does not exist'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get all categories
        const result = await client.query('SELECT * FROM categories ORDER BY name');
        
        return new Response(JSON.stringify({
            success: true,
            categories: result.rows
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error getting categories:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
