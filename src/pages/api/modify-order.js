import { getDbClient, safeRelease } from '../../lib/db-helper.js';
import { getTenantFilter } from '../../lib/tenant.js';

export const prerender = false;

export async function POST({ request, locals }) {
    try {
        console.log('🔄 Modifying order...');
        
        const { orderTimestamp, newItems, modificationNote } = await request.json();
        
        // Validate required fields
        if (!orderTimestamp || !newItems || !Array.isArray(newItems)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid data: orderTimestamp and newItems array are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (newItems.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'No items to add'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const { client, error } = await getDbClient();
        if (error) return error;
        
        try {
            const tenantId = locals.tenantId || 'default';
            const tenantFilter = getTenantFilter(tenantId);
            
            // Find the original order
            const findOrderQuery = `
                SELECT id, order_data, status, created_at 
                FROM orders 
                WHERE restaurant_id = $1 
                AND order_data->>'timestamp' = $2
                ORDER BY created_at DESC 
                LIMIT 1
            `;
            
            const result = await client.query(findOrderQuery, [
                tenantFilter.restaurant_id,
                orderTimestamp
            ]);
            
            if (result.rows.length === 0) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Original order not found'
                }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            const originalOrder = result.rows[0];
            const orderData = originalOrder.order_data;
            
            console.log(`📋 Found original order: ${originalOrder.id}`);
            console.log(`📦 Original items count: ${orderData.items?.length || 0}`);
            console.log(`➕ New items to add: ${newItems.length}`);
            
            // Format new items to match order structure
            const formattedNewItems = newItems.map(item => ({
                id: item.id || `custom_${Date.now()}_${Math.random()}`,
                name: item.name,
                quantity: parseFloat(item.shoppingQuantity || item.quantity || 0),
                shoppingQuantity: parseFloat(item.shoppingQuantity || item.quantity || 0),
                unit: item.unit,
                addedLater: true,
                addedAt: new Date().toISOString()
            }));
            
            // Merge items: combine existing items with new items
            const mergedItems = [...(orderData.items || []), ...formattedNewItems];
            
            // Update order data
            const updatedOrderData = {
                ...orderData,
                items: mergedItems,
                totalItems: mergedItems.length,
                totalQuantity: mergedItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0),
                modified: true,
                modificationNote: modificationNote || 'Добавлены недостающие товары',
                modifiedAt: new Date().toISOString()
            };
            
            // Update the order in database
            const updateQuery = `
                UPDATE orders 
                SET order_data = $1, 
                    updated_at = CURRENT_TIMESTAMP 
                WHERE id = $2 
                RETURNING id, order_data, status, created_at
            `;
            
            const updateResult = await client.query(updateQuery, [
                JSON.stringify(updatedOrderData),
                originalOrder.id
            ]);
            
            console.log(`✅ Order ${originalOrder.id} updated successfully`);
            console.log(`📊 New total items: ${mergedItems.length}`);
            
            return new Response(JSON.stringify({
                success: true,
                message: `Added ${newItems.length} items to order`,
                orderId: originalOrder.id,
                modificationOrder: {
                    department: orderData.department,
                    departmentName: orderData.departmentName,
                    items: formattedNewItems,
                    totalItems: formattedNewItems.length,
                    timestamp: orderTimestamp,
                    note: modificationNote
                },
                updatedOrder: updateResult.rows[0].order_data
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
            
        } finally {
            safeRelease(client);
        }
        
    } catch (error) {
        console.error('❌ Failed to modify order:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to modify order'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

