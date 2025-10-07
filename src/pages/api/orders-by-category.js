import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

// Helper functions for department display
function getDepartmentDisplayName(department) {
    const departmentNames = {
        'bar': 'Бар',
        'kitchen': 'Кухня',
        'housekeeping': 'Горничная',
        'custom': 'Горничная',
        'storage': 'Склад',
        'офис': 'Офис',
        'office': 'Офис'
    };
    return departmentNames[department.toLowerCase()] || department || 'Неизвестно';
}

function getDepartmentEmoji(department) {
    const departmentEmojis = {
        'bar': '🍷',
        'kitchen': '🍳',
        'housekeeping': '🧹',
        'custom': '🧹',
        'storage': '📦',
        'офис': '🏢',
        'office': '🏢'
    };
    return departmentEmojis[department.toLowerCase()] || '📋';
}

// GET: Get all orders grouped by categories with supplier information
export async function GET({ request }) {
    const { client, error } = await getDbClient();

    if (error) return error;

    try {
        const restaurantId = getTenantId(request);
        console.log(`🏢 [orders-by-category] Tenant ID: ${restaurantId}`);
        
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
        
        // Process orders as individual orders (no grouping by date)
        const individualOrders = [];
        
        orders.forEach(order => {
            const orderData = order.order_data;
            const items = orderData.items || [];
            
            if (items.length === 0) return; // Skip empty orders
            
            // Create individual order object
            const individualOrder = {
                orderId: order.order_id,
                department: orderData.department || order.created_by_role,
                departmentName: getDepartmentDisplayName(orderData.department || order.created_by_role),
                departmentEmoji: getDepartmentEmoji(orderData.department || order.created_by_role),
                timestamp: order.created_at,
                displayDate: new Date(order.created_at).toLocaleString('ru-RU', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }),
                status: order.status,
                categories: {},
                totalItems: 0,
                totalQuantity: 0
            };
            
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
                
                if (!individualOrder.categories[categoryKey]) {
                    const categoryData = categoryInfo.categoryId ? categories.get(categoryInfo.categoryId) : null;
                    
                    individualOrder.categories[categoryKey] = {
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
                const categoryRef = individualOrder.categories[categoryKey];
                const orderedQty = parseFloat(item.shoppingQuantity || item.quantity) || 0;
                
                categoryRef.items.push({
                    name: item.name,
                    quantity: orderedQty,
                    unit: item.unit,
                    department: orderData.department || order.created_by_role
                });
                
                categoryRef.totalItems++;
                individualOrder.totalItems++;
                individualOrder.totalQuantity += orderedQty;
            });
            
            // Convert categories object to array
            individualOrder.categories = Object.values(individualOrder.categories).sort((a, b) => 
                a.categoryName.localeCompare(b.categoryName)
            );
            
            individualOrders.push(individualOrder);
        });
        
        // Sort by timestamp (newest first)
        const result = individualOrders.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
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
        safeRelease(client);
    }
}
