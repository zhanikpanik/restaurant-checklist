import { getDbClient, safeRelease } from '../../lib/db-helper.js';

export const prerender = false;

// POST: Send category orders to supplier
export async function POST({ request }) {
    const { categoryId, supplierId } = await request.json();
    const { client, error } = await getDbClient();

    if (error) return error;

    
    try {
        await client.query('BEGIN');
        
        const restaurantId = 'default';
        
        // Get all orders from database (any status - allow resending)
        const ordersResult = await client.query(`
            SELECT 
                o.id as order_id,
                o.order_data,
                o.status,
                o.created_at,
                o.created_by_role
            FROM orders o
            WHERE o.restaurant_id = $1
            ORDER BY o.created_at DESC
        `, [restaurantId]);
        
        const orders = ordersResult.rows;
        
        // Get category and supplier info
        const categoryResult = await client.query(`
            SELECT 
                pc.name as category_name,
                s.name as supplier_name,
                s.phone as supplier_phone,
                s.contact_info as supplier_contact
            FROM product_categories pc
            LEFT JOIN suppliers s ON pc.supplier_id = s.id
            WHERE pc.id = $1 AND pc.restaurant_id = $2
        `, [categoryId, restaurantId]);
        
        if (categoryResult.rows.length === 0) {
            throw new Error('Category not found');
        }
        
        const categoryInfo = categoryResult.rows[0];
        
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
            products.set(prod.product_name.toLowerCase(), prod);
        });
        
        // Collect items for this category
        const categoryItems = [];
        const orderIds = [];
        
        orders.forEach(order => {
            const orderData = order.order_data;
            const items = orderData.items || [];
            
            items.forEach(item => {
                // Try to find product by name
                const productData = products.get(item.name.toLowerCase());
                
                if (productData && productData.category_id == categoryId) {
                    // Add item to category
                    const existingItem = categoryItems.find(
                        existing => existing.name.toLowerCase() === item.name.toLowerCase() && existing.unit === item.unit
                    );
                    
                    const orderedQty = parseFloat(item.shoppingQuantity || item.quantity) || 0;
                    
                    if (existingItem) {
                        existingItem.quantity += orderedQty;
                    } else {
                        categoryItems.push({
                            name: item.name,
                            quantity: orderedQty,
                            unit: item.unit,
                            department: orderData.department || order.created_by_role
                        });
                    }
                    
                    // Track order ID for status update
                    if (!orderIds.includes(order.order_id)) {
                        orderIds.push(order.order_id);
                    }
                }
            });
        });
        
        if (categoryItems.length === 0) {
            throw new Error('No items found for this category');
        }
        
        // Create a consolidated order for the supplier
        const supplierOrder = {
            categoryId: categoryId,
            categoryName: categoryInfo.category_name,
            supplier: {
                id: supplierId,
                name: categoryInfo.supplier_name,
                phone: categoryInfo.supplier_phone,
                contact: categoryInfo.supplier_contact
            },
            items: categoryItems,
            totalItems: categoryItems.length,
            createdAt: new Date().toISOString(),
            status: 'sent_to_supplier',
            originalOrderIds: orderIds
        };
        
        // Save the supplier order to database
        await client.query(
            `INSERT INTO orders (restaurant_id, order_data, status, created_by_role, sent_at) 
             VALUES ($1, $2, $3, $4, $5)`,
            [
                restaurantId,
                JSON.stringify(supplierOrder),
                'sent_to_supplier',
                'manager',
                new Date()
            ]
        );
        
        // Update original orders status to 'sent'
        if (orderIds.length > 0) {
            await client.query(
                `UPDATE orders SET status = 'sent', sent_at = $1 WHERE id = ANY($2)`,
                [new Date(), orderIds]
            );
        }
        
        await client.query('COMMIT');
        
        return new Response(JSON.stringify({
            success: true,
            message: `Order sent to ${categoryInfo.supplier_name}`,
            data: {
                categoryName: categoryInfo.category_name,
                supplierName: categoryInfo.supplier_name,
                itemsCount: categoryItems.length,
                totalQuantity: categoryItems.reduce((sum, item) => sum + item.quantity, 0)
            }
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error sending category to supplier:', error);
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
