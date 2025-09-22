import pool from '../../lib/db.js';

export const prerender = false;

// GET: Get all orders grouped by categories with supplier information
export async function GET() {
    const client = await pool.connect();
    try {
        const restaurantId = 'default';
        
        // Check if orders table has restaurant_id column
        const ordersTableCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'orders'
        `);
        
        const orderColumns = ordersTableCheck.rows.map(row => row.column_name);
        const ordersHasRestaurantId = orderColumns.includes('restaurant_id');
        
        // Get all orders from database
        let ordersQuery, ordersParams;
        if (ordersHasRestaurantId) {
            ordersQuery = `
                SELECT 
                    o.id as order_id,
                    o.order_data,
                    o.status,
                    o.created_at,
                    o.created_by_role
                FROM orders o
                WHERE o.restaurant_id = $1 
                AND o.status IN ('pending', 'sent')
                ORDER BY o.created_at DESC
            `;
            ordersParams = [restaurantId];
        } else {
            ordersQuery = `
                SELECT 
                    o.id as order_id,
                    o.order_data,
                    o.status,
                    o.created_at,
                    o.created_by_role
                FROM orders o
                WHERE o.status IN ('pending', 'sent')
                ORDER BY o.created_at DESC
            `;
            ordersParams = [];
        }
        
        const ordersResult = await client.query(ordersQuery, ordersParams);
        
        const orders = ordersResult.rows;
        
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
        let categoriesQuery, categoriesParams;
        if (hasRestaurantId) {
            categoriesQuery = `
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
            `;
            categoriesParams = [restaurantId];
        } else {
            categoriesQuery = `
                SELECT 
                    pc.id,
                    pc.name as category_name,
                    COALESCE(pc.supplier_id, NULL) as supplier_id,
                    s.name as supplier_name,
                    s.phone as supplier_phone,
                    s.contact_info as supplier_contact
                FROM product_categories pc
                LEFT JOIN suppliers s ON pc.supplier_id = s.id
            `;
            categoriesParams = [];
        }
        
        // Get categories with suppliers
        const categoriesResult = await client.query(categoriesQuery, categoriesParams);
        
        const categories = new Map();
        categoriesResult.rows.forEach(cat => {
            categories.set(cat.id, cat);
        });
        
        // Get all products with their categories (handle missing restaurant_id)
        let productsQuery, productsParams;
        
        // Check if products table has restaurant_id column
        const productsTableCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'products'
        `);
        
        const productColumns = productsTableCheck.rows.map(row => row.column_name);
        const productsHasRestaurantId = productColumns.includes('restaurant_id');
        
        if (productsHasRestaurantId) {
            productsQuery = `
                SELECT 
                    p.id as product_id,
                    p.name as product_name,
                    p.category_id,
                    pc.name as category_name
                FROM products p
                LEFT JOIN product_categories pc ON p.category_id = pc.id
                WHERE p.restaurant_id = $1
            `;
            productsParams = [restaurantId];
        } else {
            productsQuery = `
                SELECT 
                    p.id as product_id,
                    p.name as product_name,
                    p.category_id,
                    pc.name as category_name
                FROM products p
                LEFT JOIN product_categories pc ON p.category_id = pc.id
            `;
            productsParams = [];
        }
        
        const productsResult = await client.query(productsQuery, productsParams);
        
        const products = new Map();
        productsResult.rows.forEach(prod => {
            products.set(prod.product_id, prod);
        });
        
        // Process orders and group by DATE first, then by categories
        const ordersByDate = {};
        
        orders.forEach(order => {
            const orderData = order.order_data;
            const items = orderData.items || [];
            
            // Get the date of the order (format: YYYY-MM-DD)
            const orderDate = new Date(order.created_at).toISOString().split('T')[0];
            const dateKey = orderDate;
            
            if (!ordersByDate[dateKey]) {
                ordersByDate[dateKey] = {
                    date: dateKey,
                    displayDate: new Date(order.created_at).toLocaleDateString('ru-RU', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    categories: {}
                };
            }
            
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
                
                if (!ordersByDate[dateKey].categories[categoryKey]) {
                    const categoryData = categoryInfo.categoryId ? categories.get(categoryInfo.categoryId) : null;
                    
                    ordersByDate[dateKey].categories[categoryKey] = {
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
                const categoryRef = ordersByDate[dateKey].categories[categoryKey];
                const existingItem = categoryRef.items.find(
                    existing => existing.name.toLowerCase() === item.name.toLowerCase() && existing.unit === item.unit
                );
                
                if (existingItem) {
                    existingItem.quantity += parseFloat(item.quantity) || 0;
                } else {
                    categoryRef.items.push({
                        name: item.name,
                        quantity: parseFloat(item.quantity) || 0,
                        unit: item.unit,
                        orderId: order.order_id,
                        department: orderData.department || order.created_by_role
                    });
                }
                
                categoryRef.totalItems++;
            });
        });
        
        // Convert to array and sort by date (newest first)
        const result = Object.values(ordersByDate)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(dateGroup => ({
                ...dateGroup,
                categories: Object.values(dateGroup.categories).sort((a, b) => 
                    a.categoryName.localeCompare(b.categoryName)
                )
            }));
        
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
