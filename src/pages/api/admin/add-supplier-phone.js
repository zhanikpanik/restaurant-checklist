import pool from '../../../lib/db.js';

export const prerender = false;

export async function GET() {
    const client = await pool.connect();
    try {
        console.log('Adding phone number column to suppliers table...');
        
        // Check if phone column already exists
        const hasPhone = await client.query(`
            SELECT 1 FROM information_schema.columns
            WHERE table_name='suppliers' AND column_name='phone';
        `);
        
        if (hasPhone.rowCount === 0) {
            await client.query('ALTER TABLE suppliers ADD COLUMN phone VARCHAR(20);');
            console.log('✅ Added phone column to suppliers table.');
        } else {
            console.log('✅ Phone column already exists in suppliers table.');
        }
        
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Suppliers table updated with phone column'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Error updating suppliers table:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to update suppliers table',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
