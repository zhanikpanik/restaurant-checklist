import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

export async function GET() {
    try {
        const { client, error } = await getDbClient();

        if (error) return error;

        
        try {
            // Check what categories exist in the database
            const categoriesResult = await client.query('SELECT * FROM product_categories ORDER BY name ASC');
            const categories = categoriesResult.rows;
            
            // Also check if the table structure is correct
            const tableStructure = await client.query(`
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_name = 'product_categories' 
                ORDER BY ordinal_position;
            `);
            
            return new Response(JSON.stringify({ 
                success: true, 
                categoriesCount: categories.length,
                categories: categories,
                tableStructure: tableStructure.rows
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } finally {
            safeRelease(client);
        }
        
    } catch (error) {
        console.error('Error checking categories:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            details: error.stack
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
