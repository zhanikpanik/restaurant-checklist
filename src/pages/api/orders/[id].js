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
        },
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
        },
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

    // Debug: Log first item to see structure
    if (allItems.length > 0) {
      console.log(
        `🔍 Sample item structure:`,
        JSON.stringify(allItems[0], null, 2),
      );
      console.log(`📋 Available fields:`, Object.keys(allItems[0]));
    }

    // Build categories grouped by category_id and look up current suppliers
    const categoryMap = new Map();

    // Get unique category IDs from items (try multiple field names)
    const categoryIds = [
      ...new Set(
        allItems
          .map((item) => item.category_id || item.categoryId || item.category)
          .filter(Boolean),
      ),
    ];

    console.log(
      `📊 Found ${categoryIds.length} unique categories:`,
      categoryIds,
    );
    console.log(`📦 Total items:`, allItems.length);

    // Look up current suppliers for these categories
    const supplierLookup = new Map();
    if (categoryIds.length > 0) {
      const supplierQuery = `
        SELECT
          pc.id as category_id,
          pc.name as category_name,
          s.id as supplier_id,
          s.name as supplier_name,
          s.phone as supplier_phone
        FROM product_categories pc
        LEFT JOIN suppliers s ON pc.supplier_id = s.id
        WHERE pc.id = ANY($1::int[])
      `;
      const supplierResult = await client.query(supplierQuery, [categoryIds]);

      console.log(
        `🔍 Supplier lookup returned ${supplierResult.rows.length} rows`,
      );

      supplierResult.rows.forEach((row) => {
        console.log(
          `   Category ${row.category_id} (${row.category_name}) → Supplier: ${row.supplier_name} (${row.supplier_id})`,
        );
        supplierLookup.set(row.category_id, {
          supplierId: row.supplier_id,
          supplierName: row.supplier_name,
          supplierPhone: row.supplier_phone,
        });
      });
    }

    // Group items by category
    for (const item of allItems) {
      const categoryId = item.category_id || item.categoryId;
      const categoryName =
        item.categoryName || item.category || "Без категории";

      // Get current supplier info from lookup, fallback to item data
      const currentSupplier = categoryId
        ? supplierLookup.get(categoryId)
        : null;
      const supplierName =
        currentSupplier?.supplierName || item.supplierName || null;
      const supplierId = currentSupplier?.supplierId || item.supplierId || null;
      const supplierPhone =
        currentSupplier?.supplierPhone || item.supplierPhone || null;

      if (!categoryMap.has(categoryId || "no-category")) {
        categoryMap.set(categoryId || "no-category", {
          categoryId: categoryId,
          categoryName: categoryName,
          supplier: supplierName
            ? {
                id: supplierId,
                name: supplierName,
                phone: supplierPhone,
              }
            : null,
          items: [],
        });
      }

      categoryMap.get(categoryId || "no-category").items.push({
        id: item.id,
        name: item.name,
        quantity: item.quantity || item.shoppingQuantity || 0,
        shoppingQuantity: item.shoppingQuantity || item.quantity || 0,
        unit: item.unit || "",
      });
    }

    const categories = Array.from(categoryMap.values());

    // Format the response
    const formattedOrder = {
      orderId: order.order_id,
      department: orderData.department || "unknown",
      departmentName:
        orderData.departmentName || orderData.department || "Неизвестно",
      departmentEmoji: getDepartmentEmoji(orderData.department || ""),
      timestamp: order.created_at,
      status: order.status,
      createdByRole: order.created_by_role,
      categories: categories,
      items: allItems,
      totalItems: allItems.length,
      totalQuantity: allItems.reduce(
        (sum, item) =>
          sum + (parseFloat(item.quantity || item.shoppingQuantity) || 0),
        0,
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
      },
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
      },
    );
  } finally {
    safeRelease(client);
  }
}
