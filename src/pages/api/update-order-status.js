import {
  updateOrderStatus,
  updateOrderWithDelivery,
  getOrderById,
} from "../../lib/orderStorage-postgres.js";
import { getTenantId, getRestaurantConfig } from "../../lib/tenant-manager.js";

export const prerender = false;

/**
 * Create a supply in Poster for delivered order
 */
async function createPosterSupply(orderId, deliveredItems, tenantId) {
  try {
    const tenantConfig = await getRestaurantConfig(tenantId);

    // Check for poster_token (from database) or poster_access_token (from OAuth)
    const posterToken =
      tenantConfig?.poster_token || tenantConfig?.poster_access_token;

    if (!posterToken) {
      return { success: false, message: "Poster not configured" };
    }

    // Get the full order data to extract supplier and storage info
    const order = await getOrderById(orderId, tenantId);

    if (!order) {
      throw new Error("Order not found");
    }

    // Extract supplier_id and storage_id from order data
    const local_supplier_id = order.order_data?.supplier_id;
    const storage_id =
      order.order_data?.storage_id || order.order_data?.section_id;

    if (!local_supplier_id) {
      return { success: false, message: "No supplier configured for order" };
    }

    if (!storage_id) {
      return { success: false, message: "No storage configured for order" };
    }

    // Fetch the supplier to get poster_supplier_id
    const pool = (await import("../../lib/db.js")).default;
    const client = await pool.connect();

    let poster_supplier_id;
    try {
      const supplierResult = await client.query(
        "SELECT poster_supplier_id FROM suppliers WHERE id = $1 AND restaurant_id = $2",
        [local_supplier_id, tenantId],
      );

      if (
        supplierResult.rows.length === 0 ||
        !supplierResult.rows[0].poster_supplier_id
      ) {
        return {
          success: false,
          message: "Supplier not mapped to Poster supplier",
        };
      }

      poster_supplier_id = supplierResult.rows[0].poster_supplier_id;
    } finally {
      client.release();
    }

    // Get the full order items with poster_ingredient_id
    const orderItems = order.order_data?.items || [];

    // Create a map of item id to poster_ingredient_id
    const posterIdMap = {};
    orderItems.forEach((item) => {
      if (item.id && item.poster_ingredient_id) {
        posterIdMap[item.id] = item.poster_ingredient_id;
      }
    });

    // Prepare ingredients for Poster API (correct format for storage.createSupply)
    const ingredients = deliveredItems
      .map((item) => {
        // Check both poster_product_id and poster_ingredient_id, or get from map
        const posterId =
          item.poster_product_id ||
          item.poster_ingredient_id ||
          posterIdMap[item.id];
        if (!posterId) return null;

        return {
          id: String(posterId), // Ingredient ID
          type: "4", // 4 = ingredient
          num: String(item.deliveredQuantity || item.quantity), // Quantity
          sum: String(item.price || 0), // Price per unit
        };
      })
      .filter((item) => item !== null); // Remove items without Poster IDs

    if (ingredients.length === 0) {
      return { success: false, message: "No products with Poster IDs" };
    }

    // Correct API: storage.createSupply
    const posterApiUrl = `https://joinposter.com/api/storage.createSupply?token=${posterToken}`;

    const supplyData = {
      supply: {
        date: new Date().toISOString().replace("T", " ").substring(0, 19), // Y-m-d H:i:s format
        supplier_id: String(poster_supplier_id), // Poster's supplier ID
        storage_id: String(storage_id), // Storage ID
      },
      ingredient: ingredients,
    };

    // Make request to Poster API
    const response = await fetch(posterApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(supplyData),
    });

    const responseData = await response.json();

    // Check for Poster API errors
    if (responseData.error || responseData.success === 0) {
      throw new Error(
        `Poster API Error: ${responseData.error || "Unknown error"} - ${responseData.message || ""}`,
      );
    }

    return {
      success: true,
      poster_supply_id: responseData.response,
      message: "Supply created in Poster",
    };
  } catch (error) {
    console.error("❌ Poster supply failed:", error.message);
    return {
      success: false,
      error: error.message,
      message: "Failed to create supply in Poster",
    };
  }
}

export async function POST({ request }) {
  try {
    const { orderId, status, deliveredItems } = await request.json();
    const tenantId = getTenantId(request);

    if (!orderId || !status) {
      throw new Error("Order ID and status are required");
    }

    if (!["pending", "sent", "delivered"].includes(status)) {
      throw new Error("Invalid status. Must be: pending, sent, or delivered");
    }

    // If delivered items are provided, update quantities too
    if (
      status === "delivered" &&
      deliveredItems &&
      Array.isArray(deliveredItems)
    ) {
      const success = await updateOrderWithDelivery(
        orderId,
        deliveredItems,
        tenantId,
      );

      if (success) {
        // Try to create supply in Poster
        const posterResult = await createPosterSupply(
          orderId,
          deliveredItems,
          tenantId,
        );

        return new Response(
          JSON.stringify({
            success: true,
            message: `Order ${orderId} marked as delivered`,
            poster_supply: posterResult,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else {
        throw new Error("Failed to update order with delivery info");
      }
    } else {
      // Just update status
      const success = await updateOrderStatus(orderId, status, tenantId);

      if (success) {
        return new Response(
          JSON.stringify({
            success: true,
            message: `Order ${orderId} status updated to ${status}`,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      } else {
        throw new Error("Failed to update order status");
      }
    }
  } catch (error) {
    console.error("❌ Failed to update order status:", error);
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
  }
}
