import { getDbClient, safeRelease } from "../../lib/db-helper.js";
import { getTenantId } from "../../lib/tenant-manager.js";

export const prerender = false;

/**
 * Diagnostic endpoint to check orders data and tenant isolation
 */
export async function GET({ request }) {
  const tenantId = getTenantId(request);
  const { client, error } = await getDbClient();

  if (error) return error;

  try {
    // Check if restaurant_id column exists in orders
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders' AND column_name = 'restaurant_id'
    `);

    const hasRestaurantId = columnCheck.rows.length > 0;

    // Get all orders (unfiltered) - last 20
    const allOrders = await client.query(`
      SELECT id, restaurant_id, status,
             (order_data->>'department') as department,
             created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 20
    `);

    // Get orders for this tenant
    const tenantOrders = await client.query(`
      SELECT id, restaurant_id, status,
             (order_data->>'department') as department,
             created_at
      FROM orders
      WHERE restaurant_id = $1
      ORDER BY created_at DESC
    `, [tenantId]);

    // Get count by tenant
    const countByTenant = await client.query(`
      SELECT restaurant_id, COUNT(*) as count
      FROM orders
      GROUP BY restaurant_id
      ORDER BY count DESC
    `);

    // Get sections for this tenant
    const sections = await client.query(`
      SELECT id, name, poster_storage_id
      FROM sections
      WHERE restaurant_id = $1 AND is_active = true
    `, [tenantId]);

    return new Response(
      JSON.stringify({
        success: true,
        currentTenant: tenantId,
        hasRestaurantIdColumn: hasRestaurantId,
        summary: {
          totalOrdersInDb: allOrders.rows.length,
          ordersForThisTenant: tenantOrders.rows.length,
          sectionsForThisTenant: sections.rows.length,
        },
        countByTenant: countByTenant.rows,
        sections: sections.rows,
        recentOrdersAllTenants: allOrders.rows,
        ordersForCurrentTenant: tenantOrders.rows,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error checking orders data:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  } finally {
    safeRelease(client);
  }
}
