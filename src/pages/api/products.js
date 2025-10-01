import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

// PUT: Update product supplier
export async function PUT({ request }) {
    const { client, error } = await getDbClient();

    if (error) return error;

    
    try {
        const { productId, supplierId } = await request.json();
        
        if (!productId) {
            throw new Error('Product ID is required');
        }
        
        await client.query('BEGIN');
        
        const result = await client.query(
            `UPDATE products 
             SET supplier_id = $1, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $2 
             RETURNING id, name`,
            [supplierId || null, productId]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Product not found');
        }
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: `Product "${result.rows[0].name}" supplier updated successfully`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating product supplier:', error);
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
