import { getDbClient, safeRelease } from "../../../lib/db-helper.js";
import { getTenantId } from "../../../lib/tenant-manager.js";

export const prerender = false;

// Helper function for department emoji
function getDepartmentEmoji(department) {
  if (!department) return "📋";

  const deptLower = department.toLowerCase();

  if (deptLower.includes("бар") || deptLower === "bar") return "🍷";
  if (deptLower.includes("кухн") || deptLower === "kitchen") return "🍳";
  if (
    deptLower.includes("горничн") ||
    deptLower.includes("housekeeping") ||
    deptLower === "custom"
  )
    return "🧹";
  if (deptLower.includes("склад") || deptLower.includes("storage")) return "📦";
  if (deptLower.includes("офис") || deptLower.includes("office")) return "🏢";

  return "📋";
}

// GET: Get a single order by ID
export async function GET({ params, request }) {
  const { client, error } = await getDbClient();

  if (error) return error;

  try {
    const restaurantId = getTenantId(request);
    const orderId = params.id;

    console.log(`🔍 Fetching order ${orderId} for tenant ${restaurantId}`);

    if (!orderId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Order ID is required",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if orders table has restaurant_id column
    const ordersTableCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders'
    `);

    const orderColumns = ordersTableCheck.rows.map((row) => row.column_name);
    const ordersHasRestaurantId = orderColumns.includes("restaurant_id");

    // Get the order
    let orderQuery, orderParams;
    if (ordersHasRestaurantId) {
      orderQuery = `
        SELECT
          o.id as order_id,
          o.order_data,
          o.status,
          o.created_at,
          o.created_by_role
        FROM orders o
        WHERE o.id = $1 AND o.restaurant_id = $2
      `;
      orderParams = [orderId, restaurantId];
    } else {
      orderQuery = `
        SELECT
          o.id as order_id,
          o.order_data,
          o.status,
          o.created_at,
          o.created_by_role
        FROM orders o
        WHERE o.id = $1
      `;
      orderParams = [orderId];
    }

    const orderResult = await client.query(orderQuery, orderParams);

    if (orderResult.rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Order not found",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const order = orderResult.rows[0];
    const orderData = order.order_data || {};

    // Get all items from the order
    const allItems = [];
    if (orderData.categories && Array.isArray(orderData.categories)) {
      orderData.categories.forEach((category) => {
        if (category.items && Array.isArray(category.items)) {
          allItems.push(...category.items);
        }
      });
    } else if (orderData.items && Array.isArray(orderData.items)) {
      allItems.push(...orderData.items);
    }

    // Build categories grouped by supplier
    const categories = [];
    const supplierMap = new Map();

    for (const item of allItems) {
      const supplierName = item.supplierName || "Без поставщика";
      const supplierId = item.supplierId || null;

      if (!supplierMap.has(supplierName)) {
        supplierMap.set(supplierName, {
          categoryName: supplierName,
          supplierId: supplierId,
          items: [],
        });
      }

      supplierMap.get(supplierName).items.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity || item.shoppingQuantity || 0,
        shoppingQuantity: item.shoppingQuantity || item.quantity || 0,
        unit: item.unit || "",
        supplierName: supplierName,
        supplierId: supplierId,
      });
    }

    categories.push(...supplierMap.values());

    // Format the response
    const formattedOrder = {
      orderId: order.order_id,
      department: orderData.department || "unknown",
      departmentName: orderData.departmentName || orderData.department || "Неизвестно",
      departmentEmoji: getDepartmentEmoji(orderData.department || ""),
      timestamp: order.created_at,
      status: order.status,
      createdByRole: order.created_by_role,
      categories: categories,
      items: allItems,
      totalItems: allItems.length,
      totalQuantity: allItems.reduce(
        (sum, item) => sum + (parseFloat(item.quantity || item.shoppingQuantity) || 0),
        0
      ),
    };

    console.log(`✅ Found order ${orderId} with ${allItems.length} items`);

    return new Response(
      JSON.stringify({
        success: true,
        data: formattedOrder,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error fetching order:", error);
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
