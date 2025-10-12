import { deleteOrder } from '../../lib/orderStorage-postgres.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

export async function POST({ request, locals }) {
    try {
        const { orderId } = await request.json();

        if (!orderId) {
            return new Response(JSON.stringify({
                success: false,
                error: 'Order ID is required'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const tenantId = getTenantId(request);
        const success = await deleteOrder(orderId, tenantId);

        if (success) {
            return new Response(JSON.stringify({
                success: true,
                message: `Order #${orderId} deleted successfully`
            }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({
                success: false,
                error: 'Order not found or could not be deleted'
            }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error('❌ delete-order API error:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
