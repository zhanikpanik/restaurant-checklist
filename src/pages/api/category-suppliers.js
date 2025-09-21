import pool from '../../lib/db.js';

export const prerender = false;

// GET: Get all categories with their assigned suppliers
export async function GET() {
    const client = await pool.connect();
    try {
        const restaurantId = 'default';
        
        const result = await client.query(`
            SELECT 
                pc.id,
                pc.name as category_name,
                pc.supplier_id,
                s.name as supplier_name,
                s.phone as supplier_phone
            FROM product_categories pc
            LEFT JOIN suppliers s ON pc.supplier_id = s.id
            WHERE pc.restaurant_id = $1
            ORDER BY pc.name
        `, [restaurantId]);
        
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
        client.release();
    }
}

// POST: Assign supplier to category
export async function POST({ request }) {
    const { categoryId, supplierId } = await request.json();
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
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
        client.release();
    }
}
