import { readOrders, writeOrders } from '../../lib/orderStorage.js';

export const prerender = false;

function json(data, status = 200) {
    return new Response(JSON.stringify(data, null, 2), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
}

export async function POST({ request }) {
    try {
        const body = await request.json().catch(() => ({}));
        const { all, bar = [], kitchen = [] } = body || {};

        if (all) {
            await writeOrders('bar', []);
            await writeOrders('kitchen', []);
            return json({ success: true, cleared: { bar: 'all', kitchen: 'all' } });
        }

        async function deleteForDepartment(department, timestamps) {
            if (!Array.isArray(timestamps) || timestamps.length === 0) return 0;
            const timestampSet = new Set(timestamps);
            const current = await readOrders(department);
            const filtered = current.filter(o => !timestampSet.has(o.timestamp));
            await writeOrders(department, filtered);
            return current.length - filtered.length;
        }

        const deleted = {
            bar: await deleteForDepartment('bar', bar),
            kitchen: await deleteForDepartment('kitchen', kitchen)
        };

        return json({ success: true, deleted });
    } catch (error) {
        console.error('❌ delete-orders failed:', error);
        return json({ success: false, error: error.message }, 500);
    }
}


