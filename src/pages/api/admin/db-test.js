import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

export async function GET() {
    try {
        console.log('ADMIN: Testing database connection...');
        
        // Show more details about the connection string (without exposing sensitive data)
        const dbUrl = process.env.DATABASE_URL;
        let connectionInfo = 'Not set';
        if (dbUrl) {
            try {
                const url = new URL(dbUrl);
                connectionInfo = `${url.protocol}//${url.hostname}:${url.port}/${url.pathname.substring(1)}`;
            } catch (e) {
                connectionInfo = 'Set but invalid format';
            }
        }
        
        console.log('Connection info:', connectionInfo);
        
        // Test 1: Can we get a client from the pool?
        const { client, error } = await getDbClient();

        if (error) return error;

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
                connectionInfo: connectionInfo
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } finally {
            safeRelease(client);
        }
        
    } catch (error) {
        console.error('ADMIN: Database test failed:', error);
        
        // Parse the DATABASE_URL to show connection details (without password)
        const dbUrl = process.env.DATABASE_URL;
        let connectionInfo = 'Not set';
        if (dbUrl) {
            try {
                const url = new URL(dbUrl);
                connectionInfo = `${url.protocol}//${url.hostname}:${url.port}/${url.pathname.substring(1)}`;
            } catch (e) {
                connectionInfo = 'Set but invalid format';
            }
        }
        
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Database connection test failed',
            details: error.message,
            errorCode: error.code,
            connectionInfo: connectionInfo,
            stack: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
