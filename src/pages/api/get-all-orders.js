import { getAllOrders, readOrders } from '../../lib/orderStorage-postgres.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

export async function GET({ url, request }) {
    try {
        console.log('📋 Fetching all orders from server storage...');

        const searchParams = new URL(url).searchParams;
        const department = searchParams.get('department');

        // Get tenant ID from request
        const tenantId = getTenantId(request);
        console.log(`🏢 Tenant ID: ${tenantId}`);

        let orders;

        if (department) {
            // Get orders for specific department (supports any department name)
            orders = await readOrders(department, tenantId);
            console.log(`✅ Retrieved ${orders.length} orders for ${department}`);
        } else {
            // Get all orders from all departments
            orders = await getAllOrders(tenantId);
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
