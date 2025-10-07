import { addOrder } from '../../lib/orderStorage-postgres.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

export async function POST({ request, locals }) {
    try {
        console.log('💾 Saving internal order to server storage...');

        const orderData = await request.json();
        console.log('📦 Internal order data:', orderData);

        // Validate required fields
        if (!orderData.department || !orderData.items || !Array.isArray(orderData.items)) {
            throw new Error('Invalid order data: department and items array are required');
        }

        // Validate department - allow any department name
        const allowedDepartments = ['bar', 'kitchen', 'custom', 'storage', 'housekeeping', 'офис', 'office'];
        const deptLower = orderData.department.toLowerCase();

        // Allow known departments or any custom department name
        if (!allowedDepartments.includes(deptLower) && orderData.department.length < 2) {
            throw new Error('Invalid department: department name must be at least 2 characters');
        }

        // Add source field to identify as internal order
        const formattedOrder = {
            ...orderData,
            source: 'internal',
            supplier: orderData.supplier || 'Internal Order'
        };

        // Get tenant ID from request
        const tenantId = getTenantId(request);
        console.log(`🏢 Tenant ID: ${tenantId}`);

        // Save order to PostgreSQL database
        const saveSuccess = await addOrder(orderData.department, formattedOrder, tenantId);
        
        if (!saveSuccess) {
            throw new Error('Failed to save order to server storage');
        }
        
        console.log(`💾 Internal order saved to server storage successfully`);
        
        return new Response(JSON.stringify({
            success: true,
            message: `Internal order saved to server for ${orderData.department}`,
            orderData: formattedOrder
        }, null, 2), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            }
        });
        
    } catch (error) {
        console.error('❌ Failed to save internal order:', error);
        return new Response(JSON.stringify({ 
            success: false, 
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
