import pool from '../../lib/db.js';
import { getTenantId } from '../../lib/tenant-manager.js';

export const prerender = false;

/**
 * Fix department names in existing orders
 * Changes Russian department names to English keys
 * GET /api/fix-department-names
 */
export async function GET({ request }) {
    const tenantId = getTenantId(request);
    const client = await pool.connect();

    try {
        console.log(`🔧 [Fix] Fixing department names for tenant: ${tenantId}`);

        // Get all orders with Russian department names
        const result = await client.query(
            `SELECT id, order_data FROM orders WHERE restaurant_id = $1`,
            [tenantId]
        );

        console.log(`📊 [Fix] Found ${result.rows.length} total orders`);

        let fixedCount = 0;
        const departmentMapping = {
            'склад': 'storage',
            'бар': 'bar',
            'кухня': 'kitchen',
            'горничная': 'custom'
        };

        for (const row of result.rows) {
            const orderData = row.order_data;
            const currentDept = orderData.department;

            if (currentDept && departmentMapping[currentDept.toLowerCase()]) {
                const newDept = departmentMapping[currentDept.toLowerCase()];
                console.log(`🔄 [Fix] Updating order ${row.id}: "${currentDept}" -> "${newDept}"`);

                // Update the department in order_data JSON
                orderData.department = newDept;

                await client.query(
                    `UPDATE orders SET order_data = $1 WHERE id = $2`,
                    [orderData, row.id]
                );

                fixedCount++;
            }
        }

        console.log(`✅ [Fix] Fixed ${fixedCount} orders`);

        return new Response(JSON.stringify({
            success: true,
            message: `Fixed ${fixedCount} out of ${result.rows.length} orders`,
            fixedCount,
            totalOrders: result.rows.length
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('❌ [Fix] Error fixing department names:', error);
        return new Response(JSON.stringify({
            success: false,
            error: error.message
        }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        client.release();
    }
}
