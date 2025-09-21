import pool from '../../lib/db.js';

export const prerender = false;

// GET: Get all orders grouped by categories with supplier information
export async function GET() {
    const client = await pool.connect();
    try {
        const restaurantId = 'default';
        
        // Get all orders from database
        const ordersResult = await client.query(`
            SELECT 
                o.id as order_id,
                o.order_data,
                o.status,
                o.created_at,
                o.created_by_role
            FROM orders o
            WHERE o.restaurant_id = $1 
            AND o.status = 'pending'
            ORDER BY o.created_at DESC
        `, [restaurantId]);
        
        const orders = ordersResult.rows;
        
        // First ensure supplier_id column exists
        try {
            await client.query(`
                ALTER TABLE product_categories 
                ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id) ON DELETE SET NULL;
            `);
        } catch (alterError) {
            console.log('Column supplier_id might already exist or table needs to be created');
        }
        
        // Get categories with suppliers
        const categoriesResult = await client.query(`
            SELECT 
                pc.id,
                pc.name as category_name,
                COALESCE(pc.supplier_id, NULL) as supplier_id,
                s.name as supplier_name,
                s.phone as supplier_phone,
                s.contact_info as supplier_contact
            FROM product_categories pc
            LEFT JOIN suppliers s ON pc.supplier_id = s.id
            WHERE pc.restaurant_id = $1
        `, [restaurantId]);
        
        const categories = new Map();
        categoriesResult.rows.forEach(cat => {
            categories.set(cat.id, cat);
        });
        
        // Get all products with their categories
        const productsResult = await client.query(`
            SELECT 
                p.id as product_id,
                p.name as product_name,
                p.category_id,
                pc.name as category_name
            FROM products p
            LEFT JOIN product_categories pc ON p.category_id = pc.id
            WHERE p.restaurant_id = $1
        `, [restaurantId]);
        
        const products = new Map();
        productsResult.rows.forEach(prod => {
            products.set(prod.product_id, prod);
        });
        
        // Process orders and group by categories
        const categorizedOrders = {};
        
        orders.forEach(order => {
            const orderData = order.order_data;
            const items = orderData.items || [];
            
            items.forEach(item => {
                // Try to find product by name (since orders might not have product IDs)
                let categoryInfo = null;
                
                // First, try to find exact product match
                for (const [productId, productData] of products) {
                    if (productData.product_name.toLowerCase() === item.name.toLowerCase()) {
                        categoryInfo = {
                            categoryId: productData.category_id,
                            categoryName: productData.category_name || 'Без категории'
                        };
                        break;
                    }
                }
                
                // If no exact match, assign to "Без категории"
                if (!categoryInfo) {
                    categoryInfo = {
                        categoryId: null,
                        categoryName: 'Без категории'
                    };
                }
                
                const categoryKey = categoryInfo.categoryName;
                
                if (!categorizedOrders[categoryKey]) {
                    const categoryData = categoryInfo.categoryId ? categories.get(categoryInfo.categoryId) : null;
                    
                    categorizedOrders[categoryKey] = {
                        categoryId: categoryInfo.categoryId,
                        categoryName: categoryInfo.categoryName,
                        supplier: categoryData ? {
                            id: categoryData.supplier_id,
                            name: categoryData.supplier_name,
                            phone: categoryData.supplier_phone,
                            contact: categoryData.supplier_contact
                        } : null,
                        items: [],
                        totalItems: 0
                    };
                }
                
                // Add item to category
                const existingItem = categorizedOrders[categoryKey].items.find(
                    existing => existing.name.toLowerCase() === item.name.toLowerCase() && existing.unit === item.unit
                );
                
                if (existingItem) {
                    existingItem.quantity += parseFloat(item.quantity) || 0;
                } else {
                    categorizedOrders[categoryKey].items.push({
                        name: item.name,
                        quantity: parseFloat(item.quantity) || 0,
                        unit: item.unit,
                        orderId: order.order_id,
                        department: orderData.department || order.created_by_role
                    });
                }
                
                categorizedOrders[categoryKey].totalItems++;
            });
        });
        
        // Convert to array and sort
        const result = Object.values(categorizedOrders).sort((a, b) => 
            a.categoryName.localeCompare(b.categoryName)
        );
        
        return new Response(JSON.stringify({
            success: true,
            data: result,
            totalOrders: orders.length
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Error getting orders by category:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message,
            data: []
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
