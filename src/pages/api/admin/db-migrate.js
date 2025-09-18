import { setupDatabaseSchema } from '../../../lib/db-schema.js';

export const prerender = false;

export async function GET() {
    try {
        console.log('ADMIN: Manual database migration triggered...');
        await setupDatabaseSchema();
        console.log('ADMIN: Manual database migration completed successfully.');
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Database schema updated successfully. All tables should now exist.' 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('ADMIN: Manual database migration failed:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: 'Failed to update database schema.',
            details: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
