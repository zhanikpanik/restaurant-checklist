import pool from '../../lib/db.js';

export const prerender = false;

// GET: Fetch all categories with their supplier information
export async function GET() {
    const client = await pool.connect();
    try {
        const query = `
            SELECT 
                pc.id, 
                pc.name, 
                pc.supplier_id,
                s.name AS supplier_name
            FROM product_categories pc
            LEFT JOIN suppliers s ON pc.supplier_id = s.id
            ORDER BY pc.name ASC;
        `;
        const result = await client.query(query);
        return new Response(JSON.stringify({
            success: true,
            data: result.rows
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        console.error('Failed to fetch categories:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}

// POST: Create a new category OR update supplier for existing category
export async function POST({ request }) {
    const data = await request.json();
    const client = await pool.connect();
    
    try {
        // Check if this is creating a new category (has 'name') or updating supplier (has 'category_id')
        if (data.name) {
            // Creating a new category
            const { name, supplier_id } = data;
            
            if (!name.trim()) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Category name is required'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Check if category already exists
            const existingCheck = await client.query(
                'SELECT id FROM product_categories WHERE LOWER(name) = LOWER($1)',
                [name.trim()]
            );
            
            if (existingCheck.rows.length > 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Category with this name already exists'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const query = `
                INSERT INTO product_categories (name, supplier_id) 
                VALUES ($1, $2) 
                RETURNING id, name, supplier_id;
            `;
            const result = await client.query(query, [name.trim(), supplier_id || null]);
            
            return new Response(JSON.stringify({
                success: true,
                data: result.rows[0]
            }), {
                status: 201,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } else if (data.category_id !== undefined) {
            // Updating supplier for existing category
            const { category_id, supplier_id } = data;
            
            const newSupplierId = supplier_id === undefined ? null : supplier_id;
            
            const query = `
                UPDATE product_categories 
                SET supplier_id = $1 
                WHERE id = $2
                RETURNING id, name, supplier_id;
            `;
            const result = await client.query(query, [newSupplierId, category_id]);
            
            if (result.rows.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Category not found'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            return new Response(JSON.stringify({
                success: true,
                data: result.rows[0]
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Either name (for new category) or category_id (for update) is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Failed to handle category POST:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}

// DELETE: Delete a category
export async function DELETE({ request }) {
    const { id } = await request.json();
    
    if (!id) {
        return new Response(JSON.stringify({
            success: false,
            error: 'Category ID is required'
        }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Check if category is being used by products
        const usageCheck = await client.query(
            'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
            [id]
        );
        
        const productCount = parseInt(usageCheck.rows[0].count);
        if (productCount > 0) {
            await client.query('ROLLBACK');
            return new Response(JSON.stringify({
                success: false,
                error: `Cannot delete category: ${productCount} products are using this category`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Check if category is being used by custom products
        const customUsageCheck = await client.query(
            'SELECT COUNT(*) as count FROM custom_products WHERE category_id = $1',
            [id]
        );
        
        const customProductCount = parseInt(customUsageCheck.rows[0].count);
        if (customProductCount > 0) {
            await client.query('ROLLBACK');
            return new Response(JSON.stringify({
                success: false,
                error: `Cannot delete category: ${customProductCount} custom products are using this category`
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Delete the category
        const result = await client.query(
            'DELETE FROM product_categories WHERE id = $1 RETURNING name',
            [id]
        );
        
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return new Response(JSON.stringify({
                success: false,
                error: 'Category not found'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: `Category "${result.rows[0].name}" deleted successfully`
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to delete category:', error);
        return new Response(JSON.stringify({
            success: false,
            error: 'Server error'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
