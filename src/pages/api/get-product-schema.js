import pool from '../../lib/db.js';

export const prerender = false;

export async function GET() {
    const client = await pool.connect();
    try {
        // Get table columns information
        const columns = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'products'
            ORDER BY ordinal_position;
        `);

        // Get table constraints
        const constraints = await client.query(`
            SELECT conname, conkey, confkey, pg_get_constraintdef(oid) as condef
            FROM pg_constraint
            WHERE conrelid = 'products'::regclass;
        `);

        // Get sample products
        const sampleProducts = await client.query('SELECT * FROM products LIMIT 1');

        return new Response(JSON.stringify({
            success: true,
            columns: columns.rows,
            constraints: constraints.rows,
            sampleProduct: sampleProducts.rows[0] || null
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error getting product schema:', error);
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
