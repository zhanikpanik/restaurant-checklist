import pool from '../../../lib/db.js';

export const prerender = false;

export async function GET() {
    const client = await pool.connect();
    try {
        // Check product_categories table structure
        const columnsResult = await client.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns 
            WHERE table_name = 'product_categories'
            ORDER BY ordinal_position;
        `);
        
        // Check if supplier_id column exists
        const hasSupplierIdColumn = columnsResult.rows.some(
            row => row.column_name === 'supplier_id'
        );
        
        // Get sample data from product_categories
        let sampleCategories = [];
        try {
            const sampleResult = await client.query('SELECT * FROM product_categories LIMIT 5');
            sampleCategories = sampleResult.rows;
        } catch (error) {
            console.log('Could not fetch sample categories:', error.message);
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: {
                columns: columnsResult.rows,
                hasSupplierIdColumn,
                sampleCategories,
                tableExists: columnsResult.rows.length > 0
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Error checking database structure:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            data: null
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
