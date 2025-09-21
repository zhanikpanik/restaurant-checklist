import { setupDatabaseSchema } from '../../../lib/db-schema.js';

export const prerender = false;

export async function GET() {
    try {
        console.log('🔧 Manual database migration triggered...');
        await setupDatabaseSchema();
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Database migration completed successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('❌ Database migration failed:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
