export const prerender = false;

export async function POST({ request }) {
    try {
        console.log('💾 Saving external order to storage...');
        
        const orderData = await request.json();
        
        // This endpoint receives the formatted order data and returns JavaScript
        // that the client should execute to save the order to localStorage
        
        const saveScript = `
// Save external order to localStorage
try {
    console.log('💾 Saving external order to localStorage...', ${JSON.stringify(orderData)});
    
    const order = ${JSON.stringify(orderData)};
    const storageKey = order.department + 'OrderHistory';
    
    // Get existing orders
    const existingOrders = JSON.parse(localStorage.getItem(storageKey) || '[]');
    
    // Add new order to the beginning
    existingOrders.unshift(order);
    
    // Keep only last 10 orders to prevent storage bloat
    if (existingOrders.length > 10) {
        existingOrders.splice(10);
    }
    
    // Save back to localStorage
    localStorage.setItem(storageKey, JSON.stringify(existingOrders));
    
    console.log('✅ External order saved successfully!');
    console.log('🔄 Refresh /delivery page to see the new order');
    
    // Auto refresh delivery page if it's open
    if (window.location.pathname === '/delivery') {
        if (typeof loadOrders === 'function') {
            loadOrders();
        } else {
            window.location.reload();
        }
    }
    
} catch (error) {
    console.error('❌ Failed to save external order:', error);
}
        `.trim();
        
        return new Response(JSON.stringify({
            success: true,
            message: 'Save script generated',
            script: saveScript,
            executeInstructions: [
                "Copy the script from the 'script' field",
                "Open browser console on your restaurant app",
                "Paste and execute the script",
                "Order will be saved and appear in /delivery page"
            ]
        }, null, 2), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('❌ Failed to generate save script:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message 
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
