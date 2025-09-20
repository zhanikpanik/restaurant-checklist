import { readOrders, deleteOldOrders } from '../../lib/orderStorage-postgres.js';

export const prerender = false;

function json(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
}

export async function POST({ request, locals }) {
    try {
        const body = await request.json().catch(() => ({}));
        const { daysOld = 30 } = body || {};
        const tenantId = locals.tenantId || 'default';

        // Delete old orders (older than specified days)
        const deletedCount = await deleteOldOrders(daysOld, tenantId);

        return json({ 
            success: true, 
            deleted: deletedCount,
            message: `Deleted ${deletedCount} orders older than ${daysOld} days`
        });
    } catch (error) {
        console.error('❌ delete-orders failed:', error);
        return json({ success: false, error: error.message }, 500);
    }
}


