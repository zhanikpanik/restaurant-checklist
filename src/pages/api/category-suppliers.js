import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

// GET: Get all categories with their assigned suppliers
export async function GET() {
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        // Check if product_categories table exists and what columns it has
        const tableCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'product_categories'
        `);
        
        const columns = tableCheck.rows.map(row => row.column_name);
        const hasRestaurantId = columns.includes('restaurant_id');
        const hasSupplierId = columns.includes('supplier_id');
        
        // Add missing columns if needed
        if (!hasSupplierId) {
            try {
                await client.query(`
                    ALTER TABLE product_categories 
                    ADD COLUMN supplier_id INTEGER;
                `);
                console.log('✅ Added supplier_id column to product_categories');
            } catch (alterError) {
                console.log('Could not add supplier_id column:', alterError.message);
            }
        }
        
        if (!hasRestaurantId) {
            try {
                await client.query(`
                    ALTER TABLE product_categories 
                    ADD COLUMN restaurant_id VARCHAR(50) DEFAULT 'default';
                `);
                console.log('✅ Added restaurant_id column to product_categories');
            } catch (alterError) {
                console.log('Could not add restaurant_id column:', alterError.message);
            }
        }
        
        // Build query based on available columns
        let query, params;
        if (hasRestaurantId) {
            query = `
                SELECT 
                    pc.id,
                    pc.name as category_name,
                    COALESCE(pc.supplier_id, NULL) as supplier_id,
                    s.name as supplier_name,
                    s.phone as supplier_phone
                FROM product_categories pc
                LEFT JOIN suppliers s ON pc.supplier_id = s.id
                WHERE pc.restaurant_id = $1
                ORDER BY pc.name
            `;
            params = ['default'];
        } else {
            query = `
                SELECT 
                    pc.id,
                    pc.name as category_name,
                    COALESCE(pc.supplier_id, NULL) as supplier_id,
                    s.name as supplier_name,
                    s.phone as supplier_phone
                FROM product_categories pc
                LEFT JOIN suppliers s ON pc.supplier_id = s.id
                ORDER BY pc.name
            `;
            params = [];
        }
        
        const result = await client.query(query, params);
        
        return new Response(JSON.stringify({
            success: true,
            data: result.rows
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Error getting category suppliers:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}

// POST: Assign supplier to category
export async function POST({ request }) {
    const { categoryId, supplierId } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;

    
    try {
        await client.query('BEGIN');
        
        // Ensure supplier_id column exists first
        try {
            await client.query(`
                ALTER TABLE product_categories 
                ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
            `);
        } catch (alterError) {
            // Column might already exist
        }
        
        // Update category with supplier assignment
        await client.query(
            'UPDATE product_categories SET supplier_id = $1 WHERE id = $2',
            [supplierId || null, categoryId]
        );
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Supplier assigned to category successfully'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error assigning supplier to category:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        safeRelease(client);
    }
}
