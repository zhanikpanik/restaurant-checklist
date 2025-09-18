import pool from '../../../lib/db.js';

export const prerender = false;

export async function GET() {
    try {
        console.log('ADMIN: Testing database connection...');
        
        // Test 1: Can we get a client from the pool?
        const client = await pool.connect();
        console.log('✅ Database client connected successfully');
        
        try {
            // Test 2: Can we run a simple query?
            const result = await client.query('SELECT NOW() as current_time');
            console.log('✅ Simple query executed successfully');
            
            // Test 3: Can we see what tables exist?
            const tablesResult = await client.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            `);
            
            const existingTables = tablesResult.rows.map(row => row.table_name);
            console.log('✅ Found existing tables:', existingTables);
            
            return new Response(JSON.stringify({ 
                success: true, 
                message: 'Database connection test successful',
                currentTime: result.rows[0].current_time,
                existingTables: existingTables,
                databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } finally {
            client.release();
        }
        
    } catch (error) {
        console.error('ADMIN: Database test failed:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Database connection test failed',
            details: error.message,
            stack: error.stack,
            databaseUrl: process.env.DATABASE_URL ? 'Set' : 'Not set'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
