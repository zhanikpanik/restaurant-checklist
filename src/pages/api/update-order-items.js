import { getDbClient, safeRelease } from "../../lib/db-helper.js";
import { getTenantId } from "../../lib/tenant-manager.js";

export const prerender = false;

// POST: Update order items (add new items to existing order)
export async function POST({ request }) {
  const { client, error } = await getDbClient();

  if (error) return error;

  try {
    const restaurantId = getTenantId(request);
    const { orderId, items } = await request.json();

    console.log(`📝 Updating order ${orderId} with ${items.length} items`);

    if (!orderId || !items || !Array.isArray(items)) {
      throw new Error("Invalid request: orderId and items array are required");
    }

    // Get the current order
    const orderQuery = `
      SELECT id, order_data, status, created_at, created_by_role, restaurant_id
      FROM orders
      WHERE id = $1
    `;

    const orderResult = await client.query(orderQuery, [orderId]);

    if (orderResult.rows.length === 0) {
      throw new Error("Order not found");
    }

    const order = orderResult.rows[0];

    // Check tenant access
    if (order.restaurant_id && order.restaurant_id !== restaurantId) {
      throw new Error("Access denied: order belongs to different tenant");
    }

    // Get existing order data
    const orderData = order.order_data || {};

    // Update items in order_data
    orderData.items = items;

    // Recalculate totals
    orderData.totalItems = items.length;
    orderData.totalQuantity = items.reduce(
      (sum, item) => sum + (parseFloat(item.quantity || item.shoppingQuantity) || 0),
      0
    );

    // Update the order in database
    const updateQuery = `
      UPDATE orders
      SET order_data = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, order_data, status, created_at, updated_at
    `;

    const updateResult = await client.query(updateQuery, [
      JSON.stringify(orderData),
      orderId,
    ]);

    console.log(`✅ Order ${orderId} updated successfully with ${items.length} items`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order items updated successfully",
        data: updateResult.rows[0],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating order items:", error);
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
