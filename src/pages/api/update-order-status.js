import { updateOrderStatus } from '../../lib/orderStorage-postgres.js';

export const prerender = false;

export async function POST({ request, locals }) {
    try {
        const { orderId, status } = await request.json();
        const tenantId = locals.tenantId || 'default';
        
        if (!orderId || !status) {
            throw new Error('Order ID and status are required');
        }
        
        if (!['pending', 'sent', 'delivered'].includes(status)) {
            throw new Error('Invalid status. Must be: pending, sent, or delivered');
        }
        
        console.log(`🔄 Updating order ${orderId} status to ${status}...`);
        
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
