import pool from '../../lib/db.js';

export const prerender = false;

export async function GET({ url }) {
    // Check if database pool is available
    if (!pool) {
        console.error('Database pool not initialized');
        return new Response(JSON.stringify({
            success: true,
            data: [],
            message: 'Database not connected - using fallback empty categories'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const client = await pool.connect();
    try {
        // Check if product_categories table exists
        const tableExists = await client.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'product_categories'
            );
        `);

        if (!tableExists.rows[0].exists) {
            return new Response(JSON.stringify({
                success: true,
                data: [],
                message: 'Categories table does not exist'
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const categoryId = url.searchParams.get('category_id');
        const restaurantId = 'default';
        
        if (categoryId) {
            // Check if products table has restaurant_id column
            const columnsResult = await client.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'products'
            `);
            
            const columns = columnsResult.rows.map(row => row.column_name);
            const hasRestaurantId = columns.includes('restaurant_id');
            
            console.log('Products table columns:', columns);
            console.log('Has restaurant_id:', hasRestaurantId);
            
            // Get products for specific category
            let productsQuery, productsParams;
            
            if (hasRestaurantId) {
                productsQuery = `
                    SELECT p.*, s.name as supplier_name 
                    FROM products p 
                    LEFT JOIN suppliers s ON p.supplier_id = s.id 
                    WHERE p.category_id = $1 AND p.restaurant_id = $2 
                    ORDER BY p.name
                `;
                productsParams = [categoryId, restaurantId];
            } else {
                productsQuery = `
                    SELECT p.*, s.name as supplier_name 
                    FROM products p 
                    LEFT JOIN suppliers s ON p.supplier_id = s.id 
                    WHERE p.category_id = $1 
                    ORDER BY p.name
                `;
                productsParams = [categoryId];
            }
            
            const productsResult = await client.query(productsQuery, productsParams);
            
            console.log(`Found ${productsResult.rows.length} products for category ${categoryId}`);
            
            return new Response(JSON.stringify({
                success: true,
                products: productsResult.rows,
                debug: {
                    categoryId,
                    hasRestaurantId,
                    productCount: productsResult.rows.length
                }
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // Get all categories for default restaurant
            const result = await client.query('SELECT * FROM product_categories WHERE restaurant_id = $1 ORDER BY name', [restaurantId]);
            
            return new Response(JSON.stringify({
                success: true,
                data: result.rows
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('Error getting categories:', error);
        return new Response(JSON.stringify({
            success: true,
            data: [],
            error: error.message,
            message: 'Database error - using fallback empty categories'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
