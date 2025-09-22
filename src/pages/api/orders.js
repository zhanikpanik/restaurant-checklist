import { addOrder } from '../../lib/orderStorage-postgres.js';

export const prerender = false;

export async function POST({ request, locals }) {
    try {
        console.log('💾 Creating new order...');
        
        const orderData = await request.json();
        console.log('📦 Order data:', orderData);
        
        // Validate required fields
        if (!orderData.department || !orderData.items || !Array.isArray(orderData.items)) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Invalid order data: department and items array are required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Validate items
        if (orderData.items.length === 0) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Order must contain at least one item'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        for (const item of orderData.items) {
            if (!item.name || !item.quantity || !item.unit) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Each item must have name, quantity, and unit'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        // Format the order
        const formattedOrder = {
            timestamp: new Date().toISOString(),
            department: orderData.department,
            departmentName: getDepartmentDisplayName(orderData.department),
            items: orderData.items.map(item => ({
                id: item.id || generateItemId(),
                name: item.name,
                quantity: parseFloat(item.quantity),
                unit: item.unit
            })),
            totalItems: orderData.items.length,
            totalQuantity: orderData.items.reduce((sum, item) => sum + parseFloat(item.quantity), 0),
            status: orderData.status || 'pending',
            source: 'manager',
            created_by: orderData.created_by || 'manager'
        };
        
        console.log(`✅ Formatted order: ${formattedOrder.departmentName} with ${formattedOrder.items.length} items`);
        
        // Save order to PostgreSQL database
        const tenantId = locals.tenantId || 'default';
        const saveSuccess = await addOrder(orderData.department, formattedOrder, tenantId);
        
        if (!saveSuccess) {
            throw new Error('Failed to save order to database');
        }
        
        console.log(`💾 Order saved successfully`);
        
        return new Response(JSON.stringify({
            success: true,
            message: `Order created successfully for ${formattedOrder.departmentName}`,
            data: {
                department: formattedOrder.department,
                departmentName: formattedOrder.departmentName,
                itemsCount: formattedOrder.items.length,
                totalQuantity: formattedOrder.totalQuantity,
                status: formattedOrder.status
            }
        }), {
            status: 201,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Failed to create order:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message || 'Failed to create order'
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Helper function to get display name for department
function getDepartmentDisplayName(department) {
    switch (department.toLowerCase()) {
        case 'kitchen':
            return 'Кухня';
        case 'bar':
            return 'Бар';
        case 'custom':
            return 'Горничная';
        case 'manager':
            return 'Менеджер';
        default:
            return department;
    }
}

// Helper function to generate unique item ID
function generateItemId() {
    return -(Date.now() + Math.random() * 1000);
}
