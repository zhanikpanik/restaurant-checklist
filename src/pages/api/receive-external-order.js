export const prerender = false;

export async function POST({ request }) {
    try {
        console.log('📥 Receiving external order...');
        
        const orderData = await request.json();
        console.log('📦 External order data:', orderData);
        
        // Validate required fields
        if (!orderData.department || !orderData.items || !Array.isArray(orderData.items)) {
            throw new Error('Invalid order data: department and items array are required');
        }
        
        // Validate department
        if (!['bar', 'kitchen'].includes(orderData.department)) {
            throw new Error('Invalid department: must be "bar" or "kitchen"');
        }
        
        // Validate items
        if (orderData.items.length === 0) {
            throw new Error('Order must contain at least one item');
        }
        
        for (const item of orderData.items) {
            if (!item.name || !item.quantity || !item.unit) {
                throw new Error('Each item must have name, quantity, and unit');
            }
        }
        
        // Convert external order to internal format
        const formattedOrder = {
            timestamp: new Date().toISOString(),
            department: orderData.department,
            departmentName: orderData.department === 'bar' ? 'Бар' : 'Кухня',
            items: orderData.items.map(item => ({
                id: item.id || -(Date.now() + Math.random()), // Generate negative ID for external items
                name: item.name,
                quantity: parseFloat(item.quantity),
                unit: item.unit
            })),
            totalItems: orderData.items.length,
            totalQuantity: orderData.items.reduce((sum, item) => sum + parseFloat(item.quantity), 0),
            status: 'sent',
            source: 'external',
            supplier: orderData.supplier || 'External Supplier',
            notes: orderData.notes || '',
            externalOrderId: orderData.orderId || null
        };
        
        console.log(`✅ Formatted external order: ${formattedOrder.departmentName} with ${formattedOrder.items.length} items`);
        
        // Return success response with formatted order and save script
        const saveScript = `
// Auto-save external order to localStorage
try {
    const order = ${JSON.stringify(formattedOrder)};
    const storageKey = order.department + 'OrderHistory';
    
    // Get existing orders
    const existingOrders = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Add new order to the beginning
    existingOrders.unshift(order);
    
    // Keep only last 10 orders
    if (existingOrders.length > 10) {
        existingOrders.splice(10);
    }
    
    // Save to localStorage
    localStorage.setItem(storageKey, JSON.stringify(existingOrders));
    
    console.log('✅ External order auto-saved!');
    
    // Try to refresh delivery page if open
    if (window.location && window.location.pathname === '/delivery') {
        if (typeof loadOrders === 'function') {
            loadOrders();
        } else {
            setTimeout(() => window.location.reload(), 1000);
        }
    }
} catch (e) {
    console.error('❌ Auto-save failed:', e);
}`.trim();

        return new Response(JSON.stringify({ 
            success: true, 
            message: `External order received for ${formattedOrder.departmentName}`,
            orderData: formattedOrder,
            autoSaveScript: saveScript,
            instructions: {
                message: "Order received successfully!",
                automatic: "To automatically save the order, execute the 'autoSaveScript' in browser console",
                manual: [
                    "Or manually check /delivery page",
                    "Order will appear with 'External Supplier' label",
                    "Can be marked as delivered like any other order"
                ]
            }
        }, null, 2), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to process external order:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            example: {
                department: "kitchen",
                items: [
                    {
                        name: "Milk",
                        quantity: 5,
                        unit: "л"
                    },
                    {
                        name: "Bread", 
                        quantity: 10,
                        unit: "шт"
                    }
                ],
                supplier: "External Supplier Name (optional)",
                notes: "Any additional notes (optional)",
                orderId: "EXT-123 (optional)"
            }
        }, null, 2), {
            status: 400,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });
    }
}

// Handle CORS preflight requests
export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type'
        }
    });
}
