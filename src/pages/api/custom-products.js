import pool from '../../lib/db.js';

export const prerender = false;

// GET: Get custom products for a department or all departments
export async function GET({ url }) {
    const client = await pool.connect();
    try {
        const searchParams = new URL(url).searchParams;
        const departmentId = searchParams.get('department_id');

        let query, params;
        
        if (departmentId) {
            // Get products for specific department
            query = `
                SELECT 
                    cp.id,
                    cp.name,
                    cp.unit,
                    cp.min_quantity,
                    cp.current_quantity,
                    cp.category_id,
                    cp.department_id,
                    cp.created_at,
                    pc.name as category_name,
                    d.name as department_name,
                    d.emoji as department_emoji
                FROM custom_products cp
                LEFT JOIN product_categories pc ON cp.category_id = pc.id
                LEFT JOIN departments d ON cp.department_id = d.id
                WHERE cp.department_id = $1 AND cp.is_active = true
                ORDER BY cp.name ASC
            `;
            params = [departmentId];
        } else {
            // Get all custom products
            query = `
                SELECT 
                    cp.id,
                    cp.name,
                    cp.unit,
                    cp.min_quantity,
                    cp.current_quantity,
                    cp.category_id,
                    cp.department_id,
                    cp.created_at,
                    pc.name as category_name,
                    d.name as department_name,
                    d.emoji as department_emoji
                FROM custom_products cp
                LEFT JOIN product_categories pc ON cp.category_id = pc.id
                LEFT JOIN departments d ON cp.department_id = d.id
                WHERE cp.is_active = true
                ORDER BY d.name ASC, cp.name ASC
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
        console.error('Error getting custom products:', error);
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

// POST: Create new custom product
export async function POST({ request }) {
    const { name, unit, departmentId, categoryId, minQuantity, currentQuantity } = await request.json();
    const client = await pool.connect();
    
    try {
        if (!name || name.trim() === '' || !departmentId) {
            throw new Error('Product name and department are required');
        }

        await client.query('BEGIN');
        
        const result = await client.query(
            `INSERT INTO custom_products (name, unit, department_id, category_id, min_quantity, current_quantity, is_active) 
             VALUES ($1, $2, $3, $4, $5, $6, true) 
             RETURNING id, name, unit, department_id, category_id, min_quantity, current_quantity, created_at`,
            [
                name.trim(), 
                unit || 'шт', 
                departmentId, 
                categoryId || null, 
                minQuantity || 1, 
                currentQuantity || 0
            ]
        );
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Custom product created successfully',
            data: result.rows[0]
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating custom product:', error);
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

// PUT: Update custom product
export async function PUT({ request }) {
    const { id, name, unit, categoryId, minQuantity, currentQuantity } = await request.json();
    const client = await pool.connect();
    
    try {
        if (!id || !name || name.trim() === '') {
            throw new Error('Product ID and name are required');
        }

        await client.query('BEGIN');
        
        const result = await client.query(
            `UPDATE custom_products 
             SET name = $1, unit = $2, category_id = $3, min_quantity = $4, current_quantity = $5, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $6 AND is_active = true 
             RETURNING id, name, unit, category_id, min_quantity, current_quantity, department_id`,
            [name.trim(), unit || 'шт', categoryId || null, minQuantity || 1, currentQuantity || 0, id]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Custom product not found or inactive');
        }
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Custom product updated successfully',
            data: result.rows[0]
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating custom product:', error);
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

// DELETE: Soft delete custom product (mark as inactive)
export async function DELETE({ request }) {
    const { id } = await request.json();
    const client = await pool.connect();
    
    try {
        if (!id) {
            throw new Error('Product ID is required');
        }

        await client.query('BEGIN');
        
        const result = await client.query(
            `UPDATE custom_products 
             SET is_active = false, updated_at = CURRENT_TIMESTAMP 
             WHERE id = $1 AND is_active = true 
             RETURNING id, name`,
            [id]
        );
        
        if (result.rows.length === 0) {
            throw new Error('Custom product not found or already inactive');
        }
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: `Product "${result.rows[0].name}" deleted successfully`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting custom product:', error);
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
