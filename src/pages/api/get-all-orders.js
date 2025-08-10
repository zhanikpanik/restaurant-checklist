import { getAllOrders, readOrders } from '../../lib/orderStorage.js';

export const prerender = false;

export async function GET({ url }) {
    try {
        console.log('📋 Fetching all orders from server storage...');
        
        const searchParams = new URL(url).searchParams;
        const department = searchParams.get('department');
        
        let orders;
        
        if (department && ['bar', 'kitchen'].includes(department)) {
            // Get orders for specific department
            orders = await readOrders(department);
            console.log(`✅ Retrieved ${orders.length} orders for ${department}`);
        } else {
            // Get all orders from both departments
            orders = await getAllOrders();
            console.log(`✅ Retrieved ${orders.length} total orders`);
        }
        
        return new Response(JSON.stringify({
            success: true,
            data: orders,
            count: orders.length,
            source: 'server_storage'
        }, null, 2), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to fetch orders:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message,
            data: []
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
