import pool from '../../lib/db.js';

export const prerender = false;

export async function GET() {
    try {
        console.log('🔍 Testing database connection...');
        const client = await pool.connect();
        
        try {
            // Test basic connection
            const result = await client.query('SELECT NOW() as current_time');
            console.log('✅ Database connection successful:', result.rows[0]);
            
            // Check if suppliers table exists and has data
            const suppliersCheck = await client.query('SELECT COUNT(*) as count FROM suppliers');
            console.log('📊 Total suppliers in database:', suppliersCheck.rows[0].count);
            
            // Check if restaurant_id column exists
            const columnCheck = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'suppliers' AND column_name = 'restaurant_id'
            `);
            const hasRestaurantId = columnCheck.rows.length > 0;
            
            // Get sample suppliers
            const sampleQuery = hasRestaurantId 
                ? 'SELECT id, name, restaurant_id FROM suppliers LIMIT 5'
                : 'SELECT id, name FROM suppliers LIMIT 5';
            const sampleSuppliers = await client.query(sampleQuery);
            console.log('📋 Sample suppliers:', sampleSuppliers.rows);
            
            return new Response(JSON.stringify({
                success: true,
                message: 'Database connection successful',
                currentTime: result.rows[0].current_time,
                totalSuppliers: suppliersCheck.rows[0].count,
                hasRestaurantId: hasRestaurantId,
                sampleSuppliers: sampleSuppliers.rows
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            message: 'Database connection failed'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
