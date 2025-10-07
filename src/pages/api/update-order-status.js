import { updateOrderStatus, updateOrderWithDelivery } from '../../lib/orderStorage-postgres.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

export async function POST({ request }) {
    try {
        const { orderId, status, deliveredItems } = await request.json();
        const tenantId = getTenantId(request);
        console.log(`🏢 Tenant ID: ${tenantId}`);
        
        if (!orderId || !status) {
            throw new Error('Order ID and status are required');
        }
        
        if (!['pending', 'sent', 'delivered'].includes(status)) {
            throw new Error('Invalid status. Must be: pending, sent, or delivered');
        }
        
        console.log(`🔄 Updating order ${orderId} status to ${status}...`);
        
        // If delivered items are provided, update quantities too
        if (status === 'delivered' && deliveredItems && Array.isArray(deliveredItems)) {
            console.log(`📦 Updating delivered quantities for ${deliveredItems.length} items`);
            const success = await updateOrderWithDelivery(orderId, deliveredItems, tenantId);
            
            if (success) {
                return new Response(JSON.stringify({
                    success: true,
                    message: `Order ${orderId} marked as delivered with updated quantities`
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                throw new Error('Failed to update order with delivery info');
            }
        } else {
            // Just update status
            const success = await updateOrderStatus(orderId, status, tenantId);
            
            if (success) {
                return new Response(JSON.stringify({
                    success: true,
                    message: `Order ${orderId} status updated to ${status}`
                }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            } else {
                throw new Error('Failed to update order status');
            }
        }
        
    } catch (error) {
        console.error('❌ Failed to update order status:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
